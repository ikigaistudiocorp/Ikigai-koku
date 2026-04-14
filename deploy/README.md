# Koku — Deployment

## Production prerequisites

- Ubuntu 24.04 (or any modern Linux) with nginx + PM2 + Node 20+
- PostgreSQL 16+ reachable from the VPS
- SSL cert for the app domain (Let's Encrypt via certbot)
- VAPID keypair (`npx web-push generate-vapid-keys`)
- Resend API key (shared with Keigo)
- Anthropic API key (shared with Keigo)

## One-time setup

```bash
# From the VPS, as the deploy user:
git clone <repo> /srv/koku
cd /srv/koku
npm ci
npm run build

# Create /srv/koku/.env.local with real values:
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

# Nginx (run as root):
cp deploy/nginx.conf /etc/nginx/sites-available/koku
ln -sf /etc/nginx/sites-available/koku /etc/nginx/sites-enabled/koku
nginx -t && systemctl reload nginx

# TLS:
certbot --nginx -d koku.ikigaistudio.ai

# Crontab (as deploy user, CRON_SECRET in env):
crontab deploy/crontab.sample
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
