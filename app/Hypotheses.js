"use client";
import { useEffect, useState } from "react";
import { pct, tone, fmtDay, fmtStamp } from "@/lib/format";

// Every 15 days, one hypothesis per sector: what drove the market's reaction to the results
// filed in that window, from the results, the news and analyst views.

function Views({ h }) {
  const parts = [["Results", h.results_view], ["News", h.news_view], ["Analysts", h.analyst_view]].filter(([, v]) => v);
  if (!parts.length) return null;
  return (
    <div className="hy-views">
      {parts.map(([k, v]) => (
        <div key={k}><h3>{k}</h3><p>{v}</p></div>
      ))}
    </div>
  );
}

function SectorCard({ h, onOpen }) {
  const s = h.stats || {};
  return (
    <article className="panel hy">
      <header className="hy-head">
        <div>
          <h2>{h.sector}</h2>
          <span className="note">vs {h.sector_index || "sector index"}</span>
        </div>
        <span className="pill">{h.confidence || "low"} confidence</span>
      </header>

      <dl className="hy-stats">
        <div><dt>Stocks</dt><dd className="num">{s.stocks ?? "—"}</dd></div>
        <div><dt>Beat sector</dt><dd className="num">{s.beat_sector ?? "—"} of {s.stocks ?? "—"}</dd></div>
        <div><dt>Avg day 1 vs sector</dt><dd className={`num ${tone(s.avg_d1_abnormal)}`}>{pct(s.avg_d1_abnormal)}</dd></div>
        <div><dt>Avg total vs sector</dt><dd className={`num ${tone(s.avg_total_abnormal)}`}>{pct(s.avg_total_abnormal)}</dd></div>
      </dl>

      <p className="hy-claim">{h.hypothesis}</p>

      <Views h={h} />

      {h.evidence?.length > 0 && (
        <div>
          <h3>Evidence</h3>
          <ul className="hy-list">{h.evidence.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {h.would_change_if && <p className="hy-change"><b>Would be wrong if: </b>{h.would_change_if}</p>}

      <div className="hy-stocks">
        {(h.stocks || []).map((x) => (
          <button key={x.event_id} type="button" className="hy-chip" onClick={() => onOpen(x.event_id)}
            title={`${x.company || x.symbol} · ${x.days_tracked || 0} of 5 days tracked`}>
            <span className="num">{x.symbol}</span>
            <span className={`num ${tone(x.total_abnormal)}`}>{pct(x.total_abnormal)}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

export default function Hypotheses({ windows, onOpen, loaded, q }) {
  const ids = Object.keys(windows || {}).sort().reverse();
  const [wid, setWid] = useState("");
  useEffect(() => { if (!wid || !windows?.[wid]) setWid(ids[0] || ""); }, [windows]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = windows?.[wid];
  const t = (q || "").trim().toLowerCase();
  const secs = (w?.sectors || [])
    .filter((h) => !t || h.sector.toLowerCase().includes(t) || (h.stocks || []).some((x) => (x.symbol || "").toLowerCase().includes(t) || (x.company || "").toLowerCase().includes(t)))
    .sort((a, b) => (b.stats?.stocks || 0) - (a.stats?.stocks || 0) || a.sector.localeCompare(b.sector));

  return (
    <section className="ol-wrap">
      <p className="ol-disclaimer">
        <b>Sector hypotheses, every 15 days.</b> For each sector whose companies filed results in the window, the
        radar writes what seems to explain how the market reacted, from the reported numbers, the news and analyst
        views. The figures come from the radar&apos;s own price data. Model-generated research, not investment advice.
      </p>

      {ids.length > 0 && (
        <div className="controls">
          <div className="meta">
            <select className="season" value={wid} onChange={(e) => setWid(e.target.value)} aria-label="Window">
              {ids.map((k) => <option key={k} value={k}>{fmtDay(windows[k].from)} – {fmtDay(windows[k].to)}</option>)}
            </select>
            {w && <span>{w.sectors?.length || 0} sectors · {(w.sectors || []).reduce((n, h) => n + (h.stocks?.length || 0), 0)} stocks · written {fmtStamp(w.written_at)}</span>}
          </div>
          <a className="btn" href="/api/csv/hypotheses">All hypotheses CSV</a>
        </div>
      )}
      {w?.too_early?.length > 0 && (
        <p className="note">Filed but not priced yet, so they move to the next window: {w.too_early.join(", ")}</p>
      )}

      {secs.length > 0 ? (
        <div className="result-list">{secs.map((h) => <SectorCard key={h.sector} h={h} onOpen={onOpen} />)}</div>
      ) : (
        <div className="panel empty">
          {!loaded ? <b>Loading…</b> : w ? <b>Nothing matches this search.</b> : (
            <>
              <b>No hypotheses yet.</b>
              <span>A new set is written at 11:07 pm IST on the 13th and 28th of every month.</span>
            </>
          )}
        </div>
      )}
    </section>
  );
}
