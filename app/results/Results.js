"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Spark from "../Spark";
import { pct, tone, fmtDay, fmtStamp, isNum, cum } from "@/lib/format";

const SORTS = [
  ["recent", "Most recent"],
  ["best", "Best vs sector"],
  ["worst", "Worst vs sector"],
];
const FILTERS = [
  ["all", "All"],
  ["beat", "Beat sector"],
  ["lag", "Lagged sector"],
];

const seasonLabel = (s) => (s ? s.replace(/^(Q\d)(FY\d+)$/, "$1 $2") : "—");

function median(xs) {
  const a = xs.filter(isNum).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function ResultCard({ e }) {
  const s = e.summary || {};
  const total = isNum(s.cum_log_return) ? s.cum_log_return : cum(e.prices, "log_return");
  const abn = isNum(s.cum_abnormal) ? s.cum_abnormal : cum(e.prices, "abnormal");
  const sector = isNum(s.cum_sector_return) ? s.cum_sector_return : cum(e.prices, "sector_log_return");
  const d5 = (e.prices || []).find((p) => p.day_n === 5)?.date;
  const reasons = e.reasons || [];
  const pos = reasons.filter((r) => r.direction === "positive").length;
  const neg = reasons.filter((r) => r.direction === "negative").length;
  return (
    <article className="panel result">
      <header className="result-head">
        <div className="result-id">
          <Link href={`/radar?stock=${encodeURIComponent(e.id)}`} className="sym">{e.symbol}</Link>
          <span className="co">{e.company}</span>
          <span className="note">
            Results {fmtStamp(e.results_filed_at)} · D1 {fmtDay(e.reaction_day)}{d5 ? ` → D5 ${fmtDay(d5)}` : ""}
          </span>
        </div>
        <Spark prices={e.prices} />
      </header>

      <dl className="result-nums">
        <div><dt>5-day return</dt><dd className={`num ${tone(total)}`}>{pct(total)}</dd></div>
        <div><dt>vs {e.sector_index || "sector"}</dt><dd className={`num ${tone(abn)}`}>{pct(abn)}</dd></div>
        <div><dt>Sector moved</dt><dd className={`num ${tone(sector)}`}>{pct(sector)}</dd></div>
      </dl>

      {s.verdict && <p className="verdict">{s.verdict}</p>}

      {(s.top_positive?.length > 0 || s.top_negative?.length > 0) && (
        <div className="result-why">
          {s.top_positive?.length > 0 && (
            <div>
              <h3 className="up">What helped</h3>
              <ul>{s.top_positive.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {s.top_negative?.length > 0 && (
            <div>
              <h3 className="down">What hurt</h3>
              <ul>{s.top_negative.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <footer className="result-foot note">
        <span>{reasons.length} reason{reasons.length === 1 ? "" : "s"} collected · {pos} positive · {neg} negative</span>
        <Link href={`/radar?stock=${encodeURIComponent(e.id)}`}>Prices, chart and all reasons</Link>
      </footer>
    </article>
  );
}

export default function Results() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [season, setSeason] = useState("");
  const [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(async (s) => {
    try {
      const r = await fetch(`/api/radar${s ? `?season=${encodeURIComponent(s)}` : ""}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
      setData(j); setError(""); if (!s && j.season) setSeason(j.season);
    } catch (e) { setError(e.message || "Could not load the results."); }
  }, []);
  useEffect(() => { load(""); }, [load]);

  const done = useMemo(
    () => Object.entries(data?.events || {}).map(([id, e]) => ({ ...e, id })).filter((e) => e.status === "done"),
    [data]
  );
  const abnOf = (e) => (isNum(e.summary?.cum_abnormal) ? e.summary.cum_abnormal : cum(e.prices, "abnormal"));

  const t = q.trim().toLowerCase();
  const shown = done
    .filter((e) => !t || (e.symbol || "").toLowerCase().includes(t) || (e.company || "").toLowerCase().includes(t))
    .filter((e) => filter === "all" || (filter === "beat" ? abnOf(e) > 0 : abnOf(e) < 0))
    .sort((a, b) =>
      sort === "best" ? (abnOf(b) ?? -9) - (abnOf(a) ?? -9)
      : sort === "worst" ? (abnOf(a) ?? 9) - (abnOf(b) ?? 9)
      : (b.reaction_day || "").localeCompare(a.reaction_day || "") || (a.symbol || "").localeCompare(b.symbol || "")
    );

  const beat = done.filter((e) => abnOf(e) > 0).length;
  const med = median(done.map(abnOf));

  return (
    <main className="wrap results">
      <header className="top">
        <div>
          <h1>Past results</h1>
          <div className="meta">
            {data?.seasons?.length > 1 ? (
              <select className="season" value={season} aria-label="Season"
                onChange={(e) => { setSeason(e.target.value); load(e.target.value); }}>
                {data.seasons.map((s) => <option key={s} value={s}>{seasonLabel(s)}</option>)}
              </select>
            ) : <span>Season {seasonLabel(data?.season)}</span>}
            <span>Stocks that finished their five trading days after results.</span>
          </div>
        </div>
        <a className="btn" href={`/api/csv/summaries${season ? `?season=${season}` : ""}`}>summaries.csv</a>
      </header>

      {error && <div className="banner">{error} Reload the page to try again.</div>}

      <section className="figures small" aria-label="Season results">
        <div><span className="fig num">{data ? done.length : "—"}</span><span className="fig-k">finished</span></div>
        <div><span className="fig num up">{data ? beat : "—"}</span><span className="fig-k">beat their sector</span></div>
        <div><span className="fig num down">{data ? done.length - beat : "—"}</span><span className="fig-k">lagged or matched</span></div>
        <div><span className={`fig num ${tone(med)}`}>{data ? pct(med) : "—"}</span><span className="fig-k">median vs sector</span></div>
      </section>

      <div className="controls">
        <div className="seg" role="group" aria-label="Show">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
        <div className="controls-right">
          <select id="sort" className="season" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <input id="q" className="search" type="search" placeholder="Search symbol or company" aria-label="Search symbol or company"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="legend">
        <span style={{ "--c": "var(--s1)" }}>Stock</span>
        <span style={{ "--c": "var(--s2)" }}>Sector index</span>
        <span className="note">Lines show the cumulative move from the base close to day 5.</span>
      </div>

      {shown.length > 0 ? (
        <div className="result-list">{shown.map((e) => <ResultCard key={e.id} e={e} />)}</div>
      ) : (
        <div className="panel empty">
          {!data ? <b>Loading…</b> : done.length ? <b>Nothing matches this filter.</b> : (
            <>
              <b>No finished results yet.</b>
              <span>A stock lands here on the evening of its fifth trading day, with a summary of how it moved and why.</span>
              <Link href="/radar">See stocks being tracked now</Link>
            </>
          )}
        </div>
      )}
    </main>
  );
}
