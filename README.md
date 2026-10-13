# Earnings Radar — web viewer

A small Next.js app that shows the Earnings Radar data stored in
`s3://trl-earnings-radar/earnings-radar/<season>/`.

- The browser never sees AWS keys. The page calls `/api/radar`, and that route reads S3 on the server with the **read-only** key of the IAM user `earnings-radar-reader`.
- The whole site sits behind a password (browser login box), set with `SITE_USER` and `SITE_PASSWORD`.
- `/api/csv/<table>` downloads `events`, `prices`, `reasons`, `summaries` or `run_log` as CSV.
- The page refreshes itself every 5 minutes. A season picker appears once there is more than one season.

## Run on your computer

```
npm install
copy .env.example .env.local      (Windows)   or   cp .env.example .env.local
# fill in .env.local
npm run dev
```
Open http://localhost:3000 and log in with SITE_USER / SITE_PASSWORD.

## Deploy on Vercel

1. Push this folder to a GitHub repo.
2. Vercel → **Add New → Project** → import the repo. Framework: Next.js (auto-detected).
3. **Settings → Environment Variables** → add every variable from `.env.example` with real values.
4. Deploy. If you add or change variables later, redeploy.

Vercel reserves names starting with `AWS_`, which is why the variables are called `RADAR_AWS_…`.

## Files

| File | What it does |
|---|---|
| `middleware.js` | Password for every page and API route |
| `lib/s3.js` | Reads S3 (server only) |
| `app/api/radar/route.js` | Returns events + run log for a season as JSON |
| `app/api/csv/[name]/route.js` | CSV downloads |
| `app/page.js` | The dashboard |
| `app/Chart.js` | Stock vs sector chart |
