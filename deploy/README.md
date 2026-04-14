# Koku — Deployment

Production: **https://time.ikigaistudio.ai**

## Production prerequisites

- Ubuntu 24.04 (or any modern Linux) with nginx + PM2 + Node 20+
- PostgreSQL 16+ reachable from the VPS
- SSL cert for the app domain (Let's Encrypt via certbot)
- VAPID keypair (`npx web-push generate-vapid-keys`)
- Resend API key (shared with Keigo)
- Anthropic API key (shared with Keigo)
- DNS A record pointing `time.ikigaistudio.ai` at the VPS before running certbot

## One-time setup

```bash
# From the VPS, as the deploy user (we used /opt/ikigai-koku):
git clone <repo> /opt/ikigai-koku
cd /opt/ikigai-koku
npm ci
npm run build

# Create /opt/ikigai-koku/.env.local with real values:
#   DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL,
#   ANTHROPIC_API_KEY, RESEND_API_KEY,
#   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
#   NEXT_PUBLIC_VAPID_PUBLIC_KEY, CRON_SECRET

# Apply schema:
npm run migrate

# Launch under PM2:
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow printed command
```

### Nginx + TLS

`deploy/nginx.conf` already references the Let's Encrypt cert paths, so it
cannot be installed before the cert exists. Install an HTTP-only stub first,
let certbot issue the cert, then swap in the real config:

```bash
# 1) HTTP-only stub so certbot can complete the ACME challenge
sudo tee /etc/nginx/sites-available/koku >/dev/null <<'STUB'
server {
    listen 80;
    server_name time.ikigaistudio.ai;
    location / { return 200 'ok'; add_header Content-Type text/plain; }
}
STUB
sudo ln -sf /etc/nginx/sites-available/koku /etc/nginx/sites-enabled/koku
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 2) Issue cert
sudo certbot --nginx -d time.ikigaistudio.ai

# 3) Replace the stub with the real proxy config
sudo cp /opt/ikigai-koku/deploy/nginx.conf /etc/nginx/sites-available/koku
sudo nginx -t && sudo systemctl reload nginx
```

### Crontab

cron does **not** inherit your shell environment, so `CRON_SECRET` must be
declared inside the crontab itself (see `deploy/crontab.sample`). Install with:

```bash
sudo touch /var/log/koku-cron.log && sudo chown "$USER:$USER" /var/log/koku-cron.log
crontab deploy/crontab.sample   # edit the CRON_SECRET line first
```

Verify:

```bash
curl -i -H "X-Cron-Secret: $CRON_SECRET" https://time.ikigaistudio.ai/api/cron/notifications   # 200
curl -i https://time.ikigaistudio.ai/api/cron/notifications                                    # 401
```

## First-user bootstrap

The very first account to sign up through the login page is
automatically promoted to `owner` by the post-auth database hook. All
subsequent sign-ups get `developer` and must have their role adjusted
from the `/settings/users` screen (or via direct SQL).

## Launch checklist

- [ ] `.env.local` populated on the VPS
- [ ] `npm run migrate` succeeded; tables present in `\dt`
- [ ] `pm2 status` shows koku online
- [ ] `pm2 startup` installed so the process survives reboot
- [ ] `nginx -t` passes, TLS active (green padlock)
- [ ] `/api/cron/notifications` returns 401 without secret, runs with it
- [ ] Push permission prompt appears on first login, notification round-trips to a real iPhone
- [ ] Weekly Mirror preview renders with ANTHROPIC_API_KEY set
- [ ] Kinko CSV export downloads with real session data
- [ ] Both owners have clocked in and out at least once and completed the onboarding baseline
- [ ] Friday-context notification tested manually (seed an active session, fire the cron)
