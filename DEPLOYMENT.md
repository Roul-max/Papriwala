# Production Deployment Checklist

## Before Deploying

- [ ] Copy `.env.example` to `.env` and fill in real values
- [ ] Set `NODE_ENV=production` in your `.env`
- [ ] Confirm `.env` is in `.gitignore` (it is — never remove it)
- [ ] Run `npm run build` and verify `dist/` is generated
- [ ] Set admin password via `/admin/login` → Set Password on first run

## Supabase

- [ ] Run `supabase_schema.sql` once in Supabase SQL Editor
- [ ] Confirm all tables exist and RLS is disabled (schema handles this)
- [ ] Drop `expenses_dealer_id_fkey` constraint (see README)

## Server / Hosting

- [ ] Use a reverse proxy (Nginx / Caddy) in front of Node for HTTPS
- [ ] Enable SSL/TLS — HSTS header is already set in production mode
- [ ] Use a process manager: `pm2 start dist/server.cjs --name papriwale`
- [ ] Set up log rotation for pm2 logs

## OTP / SMS (currently console-only)

- [ ] Integrate Twilio or MSG91 in `server/api.ts` → `/auth/send-otp` route
- [ ] Replace `console.log` OTP line with real SMS dispatch

## Security Reminders

- [ ] Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser/frontend
- [ ] Session tokens are stored in `localStorage` — acceptable for admin-only internal tools
- [ ] Rate limiting is active: 10 login attempts per 15 minutes per IP
- [ ] All POST inputs are sanitized server-side

## Start Production Server

```bash
npm run build
NODE_ENV=production node dist/server.cjs
```
