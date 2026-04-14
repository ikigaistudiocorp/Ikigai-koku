#!/usr/bin/env bash
# Koku — one-shot VPS bootstrap.
#
# Assumes the Ikigai box that already runs Keigo + Ringi, so:
#   - Node 20+, PM2, nginx, certbot, git are already installed.
#   - You have sudo. You are running this as `phra` (or equivalent deploy user).
#
# What it does:
#   1. Installs PostgreSQL 16 if it's not already running.
#   2. Creates the koku DB + koku_user with a generated password.
#   3. Generates BETTER_AUTH_SECRET, CRON_SECRET, and VAPID keys.
#   4. Copies ANTHROPIC_API_KEY + RESEND_API_KEY from /opt/ikigai-ringi/.env.local.
#   5. Writes /opt/ikigai-koku/.env.local with everything in place.
#   6. Runs npm ci, npm run migrate, npm run build.
#   7. Starts the app under PM2 on :3001.
#
# Things it does NOT do (run these after):
#   - Install the nginx site (sudo cp deploy/nginx.conf …)
#   - Issue the TLS cert (sudo certbot --nginx -d time.ikigaistudio.ai)
#   - Install the crontab
#
# Usage:
#   cd /opt/ikigai-koku && bash scripts/bootstrap-vps.sh

set -euo pipefail

APP_DIR="/opt/ikigai-koku"
DOMAIN="time.ikigaistudio.ai"
RINGI_ENV="/opt/ikigai-ringi/.env.local"
PORT=3001

cd "$APP_DIR"

echo "==> 1. PostgreSQL 16"
if ! command -v psql >/dev/null 2>&1; then
  echo "    installing postgresql..."
  sudo apt-get update -y
  sudo apt-get install -y postgresql postgresql-contrib
fi
sudo systemctl enable --now postgresql

echo "==> 2. Database + user"
PG_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-32)"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'koku_user') THEN
    CREATE ROLE koku_user LOGIN PASSWORD '${PG_PASSWORD}';
  ELSE
    ALTER ROLE koku_user WITH PASSWORD '${PG_PASSWORD}';
  END IF;
END
\$\$;
SQL
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='koku'" \
  | grep -q 1 \
  || sudo -u postgres createdb -O koku_user koku
sudo -u postgres psql -d koku -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

echo "==> 3. Generating secrets"
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
CRON_SECRET="$(openssl rand -base64 24)"

# web-push generate-vapid-keys prints:
#   =======================================
#   Public Key:
#   <key>
#   Private Key:
#   <key>
#   =======================================
VAPID_OUT="$(npx --yes web-push generate-vapid-keys 2>/dev/null | tr -d '\r')"
VAPID_PUBLIC_KEY="$(echo "$VAPID_OUT"  | awk '/Public Key:/  {getline; print; exit}')"
VAPID_PRIVATE_KEY="$(echo "$VAPID_OUT" | awk '/Private Key:/ {getline; print; exit}')"

echo "==> 4. Harvesting shared API keys from Ringi"
if [[ ! -r "$RINGI_ENV" ]]; then
  echo "    !! cannot read $RINGI_ENV — run: sudo chmod +r $RINGI_ENV"
  exit 1
fi
ANTHROPIC_API_KEY="$(grep -E '^ANTHROPIC_API_KEY=' "$RINGI_ENV" | head -1 | cut -d= -f2-)"
RESEND_API_KEY="$(grep -E '^RESEND_API_KEY=' "$RINGI_ENV" | head -1 | cut -d= -f2-)"
if [[ -z "$ANTHROPIC_API_KEY" ]]; then
  echo "    !! ANTHROPIC_API_KEY not found in $RINGI_ENV"
  exit 1
fi
if [[ -z "$RESEND_API_KEY" || "$RESEND_API_KEY" == "your-resend-key" ]]; then
  echo "    ** RESEND_API_KEY missing or placeholder in Ringi; weekly mirror"
  echo "       email will be disabled until you paste a real key later."
  RESEND_API_KEY="placeholder"
fi

echo "==> 5. Writing $APP_DIR/.env.local"
umask 077
cat > "$APP_DIR/.env.local" <<EOF
DATABASE_URL=postgresql://koku_user:${PG_PASSWORD}@127.0.0.1:5432/koku
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
NEXT_PUBLIC_APP_URL=https://${DOMAIN}

ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
RESEND_API_KEY=${RESEND_API_KEY}

VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
VAPID_SUBJECT=mailto:admin@ikigaistudio.ai
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}

CRON_SECRET=${CRON_SECRET}
EOF
chmod 600 "$APP_DIR/.env.local"

echo "==> 6. npm ci + migrate + build"
npm ci
npm run migrate
npm run build

echo "==> 7. PM2 launch"
if pm2 describe koku >/dev/null 2>&1; then
  pm2 reload koku
else
  pm2 start ecosystem.config.js
fi
pm2 save

echo
echo "================================================================"
echo " Koku is running on http://127.0.0.1:${PORT}"
echo
echo " Next manual steps (run as root):"
echo
echo "   sudo cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/koku"
echo "   sudo ln -sf /etc/nginx/sites-available/koku /etc/nginx/sites-enabled/koku"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo "   sudo certbot --nginx -d ${DOMAIN}"
echo
echo " Crontab (as your deploy user):"
echo
echo "   sed 's|\$CRON_SECRET|${CRON_SECRET}|g' $APP_DIR/deploy/crontab.sample | crontab -"
echo
echo " Then open: https://${DOMAIN}"
echo "================================================================"
