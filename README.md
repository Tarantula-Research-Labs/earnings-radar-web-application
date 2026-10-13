# Tremor — Tarantula Research Labs

Tremor tracks every Nifty 500 company for five trading days after it reports quarterly
results: how far the stock moved, how much of that was the stock rather than its sector,
and what the news said caused it.

This app shows the data the Earnings Radar pipeline stores in
`s3://trl-earnings-radar/earnings-radar/<season>/`.

| Page | What it shows |
|---|---|
| `/` | Overview: biggest reaction-day moves, season figures, how it works, method, latest reasons |
| `/radar` | Full dashboard: watchlist, stock detail with chart, reasons, run log, outlook, CSV downloads. `/radar?stock=TCS_Q2FY27` opens one stock |
| `/results` | Past results: every stock that finished its 5 days, with its summary and path vs sector |

- The site is public. AWS keys never reach the browser: pages and `/api/*` read S3 on the server with the **read-only** key of the IAM user `earnings-radar-reader`.
- `/api/radar` is cached at Vercel's edge for 60 seconds, and the home page is rebuilt at most every 2 minutes, so traffic does not hit S3 on every visit.
- **Download** menu (Radar and Past results): pick tables, stocks (all / being tracked / past results) and seasons (this one / all). One table downloads as CSV, several as a ZIP of CSVs. Every row has `season`, `symbol` and `company`. Built by `/api/export?tables=reasons,fundamentals&stocks=past&seasons=all`.
- `/api/csv/<table>` returns the pipeline's own CSV for one season (`events`, `prices`, `reasons`, `fundamentals`, `summaries`, `outlook`, `run_log`).
- **Outlook** tab (Radar): the evening run's view of each stock until its next results (stance vs sector, confidence, bull/base/bear with odds, watch/catalysts/risks), written once after day 5 and scored every evening. The top shows the track record: on track / off track now, and the hit rate once outlooks reach next results.
- On phones the tables switch to cards.

## Run on your computer

```
npm install
copy .env.example .env.local      (Windows)   or   cp .env.example .env.local
# fill in .env.local
npm run dev
```
Open http://localhost:3000.

To try the site on saved files instead of S3, set `RADAR_LOCAL_DIR` to a folder laid out like the bucket
(`<dir>/earnings-radar/Q2FY27/events.json`, `runs.json`).

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
| `app/Spark.js` | Small 5-day line used on Past results |
| `app/results/Results.js` | Past results page |
| `app/Nav.js` | Top bar |
| `app/api/radar/route.js` | Season data as JSON |
| `app/api/csv/[name]/route.js` | The pipeline's CSV for one season |
| `app/api/export/route.js` + `lib/export.js` | Download menu: chosen tables, stocks and seasons as CSV or ZIP |
| `app/DownloadMenu.js` | The Download menu |
| `app/Fundamentals.js` | Day 1 / Day 5 fundamentals tables |
| `app/Outlook.js` | Outlook tab, outlook cards and track record |
| `middleware.js` | Placeholder from the old login; safe to delete |
