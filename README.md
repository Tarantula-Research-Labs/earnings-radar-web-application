# Tremor — Tarantula Research Labs

Tremor tracks every Nifty 500 company for five trading days after it reports quarterly
results: how far the stock moved, how much of that was the stock rather than its sector,
and what the news said caused it.

This app shows the data the Earnings Radar pipeline stores in
`s3://trl-earnings-radar/earnings-radar/<season>/`.

| Page | What it shows |
|---|---|
| `/` | Overview: biggest reaction-day moves, season figures, how it works, method, latest reasons |
| `/radar` | Full dashboard: watchlist, stock detail with chart, reasons, run log, CSV downloads |

- The site is public. AWS keys never reach the browser: pages and `/api/*` read S3 on the server with the **read-only** key of the IAM user `earnings-radar-reader`.
- `/api/radar` is cached at Vercel's edge for 60 seconds, and the home page is rebuilt at most every 2 minutes, so traffic does not hit S3 on every visit.
- `/api/csv/<table>` downloads `events`, `prices`, `reasons`, `summaries` or `run_log`.
- On phones the tables switch to cards.

## Run on your computer

```
npm install
copy .env.example .env.local      (Windows)   or   cp .env.example .env.local
# fill in .env.local
npm run dev
```
Open http://localhost:3000.

## Deploy on Vercel

Import the repo, add the variables from `.env.example` under **Settings → Environment Variables**, deploy.
Vercel reserves names starting with `AWS_`, which is why the variables are called `RADAR_AWS_…`.

## Files

| File | What it does |
|---|---|
| `lib/s3.js` | Reads S3 (server only) |
| `lib/radar.js` | Loads one season (events + run log) |
| `app/page.js` | Home page |
| `app/radar/Dashboard.js` | The dashboard |
| `app/Chart.js` | Stock vs sector chart |
| `app/Nav.js` | Top bar |
| `app/api/radar/route.js` | Season data as JSON |
| `app/api/csv/[name]/route.js` | CSV downloads |
| `middleware.js` | Placeholder from the old login; safe to delete |
