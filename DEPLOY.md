# Deploying to Render — step by step

The repo is committed and Render-ready. This takes about 5 minutes.
You need two free accounts: **GitHub** and **Render**.

---

## Step 1 — Push to GitHub

Create a new **empty** repo at <https://github.com/new> (no README, no .gitignore).
Then, from the project folder:

```bash
git remote add origin https://github.com/YOUR_USERNAME/warframe-prime-arbitrage.git
git branch -M main
git push -u origin main
```

The git history is already committed, so this is the only git work required.

---

## Step 2 — Deploy on Render

1. Go to <https://dashboard.render.com> and sign in with GitHub.
2. Click **New → Blueprint**.
3. Select your repo. Render reads `render.yaml` automatically and fills in
   the build command, start command, health check and all environment variables.
4. Click **Apply**.

First build takes roughly 3–5 minutes. Your URL will be:

```
https://warframe-prime-arbitrage-scanner.onrender.com
```

(Render appends a suffix if that name is taken.)

### Manual alternative

If you prefer **New → Web Service** instead of a Blueprint:

| Setting | Value |
|---|---|
| Runtime | Node |
| Build command | `npm ci && npx prisma generate && npm run build` |
| Start command | `npm run start:render` |
| Health check path | `/api/health` |
| Instance type | Free |

Then add the environment variables listed in `render.yaml`
(at minimum `DATABASE_URL=file:/tmp/dev.db` and `NODE_ENV=production`).

---

## Step 3 — Verify it works

```bash
curl https://YOUR-APP.onrender.com/api/health
```

Expect `"status":"healthy"`. The scanner warms in the background, so
`/api/opportunities` has real data within roughly 30–60 seconds of the first request.

---

## About "24/7" — read this before relying on it

**Render's free tier does not run 24/7 by default.** Free web services
**spin down after 15 minutes without traffic**, and the next request takes
**~30–60 seconds** to wake the container. Your link stays permanently valid;
it is just slow on the first hit after an idle period.

### Keeping it always warm (and the catch)

Render gives each workspace **750 free instance hours per month**. A 31-day
month is **744 hours**, so one continuously-running free service *just* fits,
with about 6 hours to spare.

That means you can ping the app every ~10 minutes to prevent spin-down using a
free uptime monitor such as UptimeRobot, cron-job.org, or a GitHub Action.
Point it at `/api/health` (a cheap endpoint that does not hit Warframe.market).

**The catch:** the 750 hours are shared across the whole workspace. If you run
**any second free service**, you will exceed the quota and Render suspends
*all* your free web services until the month resets. Keeping this app awake
means it must be the only free web service in that workspace.

Also note Render's own docs state free services "can restart at any time"
because they run on spare capacity. The app is built for this — it re-fetches
all market data from Warframe.market on every boot and starts fine from an
empty database — but genuinely uninterrupted uptime is not something the free
tier guarantees.

### If you want real 24/7

Render's **Starter** plan is $7/month per service and never sleeps. That is the
only way to get a guaranteed always-on instance on Render.

---

## Free alternatives worth considering

The app is a standard Next.js server, so it also runs on:

- **Vercel** (free hobby tier) — no cold-start sleep for the web layer. The
  background scanner loop will not run persistently on serverless, so opportunities
  populate on demand via the warmup path rather than a background timer.
- **Fly.io** / **Koyeb** — free allowances that support always-on containers.

For this app specifically, Render is the best fit because the background scanner
depends on a long-lived Node process.

---

## After deploying

The watchlist and price history reset on every restart because the filesystem is
ephemeral — this is expected and documented. If you want them to persist, add a
free Render Postgres instance and change the `provider` in `prisma/schema.prisma`
from `sqlite` to `postgresql`, then set `DATABASE_URL` to the Postgres connection
string. No application code changes are needed; all persistence already routes
through the `withDb()` helper.

Note that free Render Postgres databases expire after 30 days.
