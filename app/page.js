import Link from "next/link";
import { getRadar, seasonLabel } from "@/lib/radar";
import { pct, tone, fmtDay, fmtStamp, bucket, day1, isNum } from "@/lib/format";

// Rebuilt from S3 at most every 2 minutes.
export const revalidate = 120;

async function load() {
  try { return await getRadar(); } catch (e) { console.error("home:", e); return null; }
}

const STEPS = [
  ["08:45", "Find reporters", "Reads the NSE board-meeting calendar and adds every Nifty 500 company reporting today, with its last close as the base price."],
  ["15:20", "Check filings", "Looks for results filed on NSE. Results before the 3:30 pm close make today the reaction day; later ones make it the next trading day."],
  ["20:50", "Price and read", "Prices every tracked stock from NSE's official closing file, then reads the day's news and analyst notes and writes down the reasons given for each move."],
];

export default async function Home() {
  const data = await load();
  const events = Object.entries(data?.events || {}).map(([id, e]) => ({ ...e, id }));

  const movers = events
    .map((e) => ({ id: e.id, symbol: e.symbol, company: e.company, sector: e.sector_index, abn: day1(e.prices, "abnormal"), raw: day1(e.prices, "log_return") }))
    .filter((m) => isNum(m.abn))
    .sort((a, b) => Math.abs(b.abn) - Math.abs(a.abn))
    .slice(0, 8);
  const maxAbs = Math.max(0.01, ...movers.map((m) => Math.abs(m.abn)));

  const counts = { tracking: 0, waiting: 0, done: 0 };
  for (const e of events) if (counts[bucket(e.status)] != null) counts[bucket(e.status)]++;
  const reasons = events
    .flatMap((e) => (e.reasons || []).map((r) => ({ ...r, symbol: e.symbol })))
    .filter((r) => r.url && /^https?:\/\//.test(r.url));
  // Newest reason per stock, four stocks at most
  const seen = new Set();
  const latest = [...reasons]
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.day_n ?? 0) - (a.day_n ?? 0))
    .filter((r) => !seen.has(r.symbol) && seen.add(r.symbol))
    .slice(0, 4);

  const runs = [];
  for (const d of Object.values(data?.runs || {})) for (const r of d.runs || []) runs.push(r);
  runs.sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""));
  const last = runs[0];
  const waiting = events.filter((e) => bucket(e.status) === "waiting").map((e) => e.symbol);

  return (
    <main className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Tarantula Research Labs</p>
          <h1 className="hero-title">Tremor</h1>
          <p className="lead">
            Tremor follows every Nifty 500 company for five trading days after it reports quarterly results.
            It records how far the stock moved, how much of that move was the stock rather than its sector,
            and what the news said caused it.
          </p>
          <div className="hero-actions">
            <Link href="/radar" className="cta">Open the radar</Link>
            <a href="#how" className="cta-2">How it works</a>
          </div>
          <p className="status">
            <span className={`dot ${last?.status || ""}`} />
            {data ? <>Season {seasonLabel(data.season)} · {last ? `last run ${last.task}, ${fmtStamp(last.started_at)}` : "no runs yet"}</> : "Live data is unavailable right now."}
          </p>
        </div>

        <figure className="quake panel">
          <figcaption>
            <h2>Biggest reaction-day moves</h2>
            <p className="note">Day-1 return minus the sector index, {seasonLabel(data?.season)} results so far</p>
          </figcaption>
          {movers.length === 0 ? (
            <p className="muted quake-empty">Moves appear here after the first reaction-day close is recorded.</p>
          ) : (
            <ol className="quake-list">
              {movers.map((m) => (
                <li key={m.id} title={`${m.symbol}: stock ${pct(m.raw)}, sector-adjusted ${pct(m.abn)}`}>
                  <Link href="/radar" className="q-sym">{m.symbol}</Link>
                  <span className="q-track" aria-hidden="true">
                    <span className={`q-bar ${m.abn >= 0 ? "pos" : "neg"}`} style={{ width: `${(Math.abs(m.abn) / maxAbs) * 50}%` }} />
                  </span>
                  <span className={`q-val num ${tone(m.abn)}`}>{pct(m.abn)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="note quake-foot">Bars share one scale. Centre line is zero.</p>
        </figure>
      </section>

      <section className="figures" aria-label="Season so far">
        <div><span className="fig num">{data ? events.length : "—"}</span><span className="fig-k">companies on the radar</span></div>
        <div><span className="fig num">{data ? counts.tracking : "—"}</span><span className="fig-k">being tracked now</span></div>
        <div><span className="fig num">{data ? reasons.length : "—"}</span><span className="fig-k">reasons collected</span></div>
        <div><span className="fig num">{data ? counts.done : "—"}</span><span className="fig-k">5-day summaries done</span></div>
      </section>

      <section id="how" className="block">
        <h2 className="block-title">How a trading day runs</h2>
        <ol className="steps">
          {STEPS.map(([t, h, p]) => (
            <li key={t} className="step">
              <span className="step-time num">{t}</span>
              <div><h3 className="step-h">{h}</h3><p>{p}</p></div>
            </li>
          ))}
        </ol>
        {waiting.length > 0 && <p className="note">Waiting for results now: {waiting.join(", ")}.</p>}
      </section>

      <section className="block">
        <h2 className="block-title">Method</h2>
        <dl className="method">
          <div><dt>Base close (D0)</dt><dd>The last close before the reaction day. All returns are measured from it.</dd></div>
          <div><dt>Reaction day (D1)</dt><dd>The first session that could trade on the results. Tracking runs from D1 to D5.</dd></div>
          <div><dt>Abnormal return</dt><dd>The stock&apos;s daily log return minus its sector index&apos;s log return, e.g. TCS against Nifty IT. Nifty 50 is recorded too.</dd></div>
          <div><dt>Prices</dt><dd>NSE&apos;s official end-of-day files for stocks and indices, never estimates.</dd></div>
          <div><dt>Reasons</dt><dd>Short summaries of what news and brokerages said, each with its source, and a check of whether the article&apos;s figures match the actual move.</dd></div>
        </dl>
      </section>

      {latest.length > 0 && (
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">Latest reasons</h2>
            <Link href="/radar" className="more">All reasons</Link>
          </div>
          <ul className="reason-grid">
            {latest.map((r, i) => (
              <li key={i} className="panel rcard">
                <div className="card-top">
                  <span className="sym-static num">{r.symbol}</span>
                  <span className="note">D{r.day_n} · {fmtDay(r.date)}</span>
                </div>
                <p>
                  <span className={`dir ${r.direction === "positive" ? "up" : r.direction === "negative" ? "down" : ""}`}>
                    {r.direction === "positive" ? "+" : r.direction === "negative" ? "−" : "±"}
                  </span>{" "}
                  {r.reason}
                </p>
                <div className="card-meta">
                  <span className="chip">{r.category}</span>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">{r.source}</a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
