# API on AWS Lightsail

Production API: `https://api.crystalinnovationhub.com.ng`. One Ubuntu 24.04 server (about 1 GB RAM) running Node 22 under systemd, with Caddy in front for HTTPS. The website stays a static site (Render) at `https://crystalinnovationhub.com.ng`. The database and auth stay on Supabase.

Run **one** copy of the API: login and registration rate limits are kept in memory.

## 1. Create the server (Lightsail console)

1. Create instance: Linux, Ubuntu 24.04, about 1 GB RAM. Region: the AWS region closest to the Supabase project's region (Supabase: Project Settings > General).
2. Networking: create and attach a **static IP**.
3. Firewall (IPv4 and IPv6): SSH 22 (restrict to your IP if you can), HTTP 80, HTTPS 443. Do **not** open 4000.
4. Billing: set a budget alert.

## 2. DNS

At the DNS host for `crystalinnovationhub.com.ng`:

| Type | Name | Value |
|---|---|---|
| A | `api` | the Lightsail static IP |

If the DNS is on Cloudflare, set this record to **DNS only** (grey cloud). Behind Cloudflare's proxy the API would see Cloudflare's address and the per-address rate limits would stop working.

The website (`@` and `www`) points at Render: add both as custom domains on the Render Static Site and use the records Render shows.

## 3. Install (SSH into the server)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
sudo npm install -g pnpm

sudo mkdir -p /opt/vec && sudo chown ubuntu /opt/vec
git clone https://github.com/tifewalker/Vic-LMS.git /opt/vec   # private repo: use a read-only deploy key or a token
cd /opt/vec
pnpm install --frozen-lockfile --filter api...
pnpm --filter api build
```

Caddy: follow the Ubuntu steps at https://caddyserver.com/docs/install, then

```bash
sudo cp /opt/vec/deploy/aws/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 4. Secrets

`sudo nano /etc/vec-api.env`, then `sudo chmod 600 /etc/vec-api.env`. Values for the Supabase keys come from Supabase (Project Settings > API) or the old Render service.

```
NODE_ENV=production
PORT=4000
WEB_URL=https://crystalinnovationhub.com.ng,https://www.crystalinnovationhub.com.ng
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_PROVIDER=console
API_PUBLIC_URL=https://api.crystalinnovationhub.com.ng
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=https://crystalinnovationhub.com.ng
```

The two `VAPID_` keys turn on class reminders by push notification (without them the API runs, with reminders off). Copy the pair from `api/.env`, or make a new pair with `npx web-push generate-vapid-keys`. Keep the same pair for good: a new pair means every student has to turn reminders on again. The API checks every minute and sends each class's reminder about an hour before it starts, which is one more reason to run a single copy.

`WEB_URL` lists every address the website is opened from (comma separated, no trailing slash). Add the `.onrender.com` address too while it is still in use. A missing one shows as a CORS error in the browser.

## 5. Start

```bash
sudo cp /opt/vec/deploy/aws/vec-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vec-api
curl localhost:4000/health                              # {"ok":true}
curl https://api.crystalinnovationhub.com.ng/health     # once DNS has spread
```

Logs: `journalctl -u vec-api -f`. If an environment variable is missing, the log names it and the API stops.

## 6. Point the website at it

On the Render Static Site set `NEXT_PUBLIC_API_URL=https://api.crystalinnovationhub.com.ng` and **redeploy** (the value is built into the site). Then check: admin, tutor and student logins, registering a test student, opening a class. Keep the old Render API for a few days as a fallback, then delete it.

## Updates

```bash
bash /opt/vec/deploy/aws/update.sh
```

It pulls `main`, installs, builds, restarts and waits for `/health`; if the API does not come up it prints the last log lines. Database changes still go through `api/supabase/migrations`.
