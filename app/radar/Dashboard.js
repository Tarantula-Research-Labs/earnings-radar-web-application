"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Chart from "../Chart";
import Fundamentals from "../Fundamentals";
import DownloadMenu from "../DownloadMenu";
import Outlook, { OutlookCard } from "../Outlook";
import Hypotheses from "../Hypotheses";
import { pct, tone, fmtDay, fmtStamp, STATUS, bucket, day1, cum, isNum } from "@/lib/format";

const TABS = [["watch", "Watchlist"], ["reasons", "Reasons"], ["runs", "Run log"], ["outlook", "Outlook"], ["hypo", "Hypotheses"]];
const CSVS = ["events", "prices", "reasons", "fundamentals", "summaries", "outlook", "run_log"];

function Pill({ status }) {
  const cls = status === "tracking" ? "tracking" : status === "done" ? "done" : bucket(status) === "waiting" && status !== "waiting" ? "warn" : "";
  return <span className={`pill ${cls}`}>{STATUS[status] || status || "—"}</span>;
}

function reasonBits(r) {
  return {
    dir: r.direction === "positive" ? "+" : r.direction === "negative" ? "−" : "±",
    dcls: r.direction === "positive" ? "up" : r.direction === "negative" ? "down" : "",
    chk: { yes: "Yes", no: "No", partly: "Partly", unchecked: "Not checked" }[r.matches_numbers] || "Not checked",
    safeUrl: r.url && /^https?:\/\//.test(r.url) ? r.url : null,
  };
}

// Phone layout for one reason
function ReasonCard({ r, onOpen }) {
  const { dir, dcls, chk, safeUrl } = reasonBits(r);
  return (
    <li className="card">
      <div className="card-top">
        {onOpen ? <button type="button" className="sym" onClick={() => onOpen(r.event_id)}>{r.symbol}</button> : <span className="num">D{r.day_n}</span>}
        <span className="note">{onOpen ? `D${r.day_n} · ` : ""}{fmtDay(r.date)}</span>
      </div>
      <p className="card-text"><span className={`dir ${dcls}`}>{dir}</span> {r.reason}</p>
      <div className="card-meta">
        <span className="chip">{r.category || "other"}</span>
        {safeUrl ? <a href={safeUrl} target="_blank" rel="noopener noreferrer">{r.source || "link"}</a> : <span>{r.source}</span>}
        <span className={r.matches_numbers === "no" ? "down" : "note"}>Numbers: {chk}</span>
      </div>
      {r.published_at && <div className="note">Published {fmtStamp(r.published_at)}</div>}
    </li>
  );
}

function ReasonRow({ r, onOpen }) {
  const { dir, dcls, chk, safeUrl } = reasonBits(r);
  return (
    <tr>
      {onOpen && <td><button type="button" className="sym" onClick={() => onOpen(r.event_id)}>{r.symbol}</button></td>}
      <td className="num">{r.day_n != null ? `D${r.day_n}` : "—"}</td>
      <td className="num">{fmtDay(r.date)}</td>
      <td className={`dir ${dcls}`} title={r.direction || "mixed"}>{dir}</td>
      <td>{r.category || "—"}</td>
      <td className="reason">{r.reason}</td>
      <td>
        {safeUrl ? <a href={safeUrl} target="_blank" rel="noopener noreferrer">{r.source || "link"}</a> : r.source || "—"}
        <span className="note pub" title={r.captured_at ? `Recorded ${fmtStamp(r.captured_at)}` : undefined}>
          {r.published_at ? fmtStamp(r.published_at) : "time not given"}
        </span>
      </td>
      <td className={r.matches_numbers === "no" ? "down" : ""}>{chk}</td>
    </tr>
  );
}

// One stock as a watchlist row (wide screens) or card (phones)
function stockVals(e) {
  const cr = isNum(e.cum_log_return) ? e.cum_log_return : cum(e.prices, "log_return");
  const ca = isNum(e.cum_abnormal) ? e.cum_abnormal : cum(e.prices, "abnormal");
  return { d1: day1(e.prices, "log_return"), a1: day1(e.prices, "abnormal"), cr, ca };
}

const STOCK_HEAD = (
  <tr>
    <th>Stock</th><th>Results filed (IST)</th><th>Reaction day</th><th>Progress</th>
    <th className="n">Day 1</th><th className="n">Day 1 abnormal</th><th className="n">Total so far</th><th className="n">Abnormal so far</th><th>Status</th>
  </tr>
);

function StockRow({ e, selected, onClick }) {
  const { d1, a1, cr, ca } = stockVals(e);
  return (
    <tr className={`row ${selected ? "sel" : ""}`} onClick={onClick}>
      <td><button type="button" className="sym">{e.symbol}</button><span className="co">{e.company}</span></td>
      <td className="num">{e.results_filed_at ? fmtStamp(e.results_filed_at) : e.meeting_date ? `Meeting ${fmtDay(e.meeting_date)}` : "—"}</td>
      <td>{fmtDay(e.reaction_day)}</td>
      <td><span className="prog">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= (e.day_count || 0) ? "on" : ""} />)}</span><span className="note">{e.day_count || 0}/5</span></td>
      {[d1, a1, cr, ca].map((v, i) => <td key={i} className={`n ${tone(v)}`}>{pct(v)}</td>)}
      <td><Pill status={e.status} /></td>
    </tr>
  );
}

function StockCard({ e, selected, onClick }) {
  const { d1, ca } = stockVals(e);
  return (
    <li className={`card tap ${selected ? "sel" : ""}`} onClick={onClick}>
      <div className="card-top">
        <span><button type="button" className="sym">{e.symbol}</button><span className="co">{e.company}</span></span>
        <Pill status={e.status} />
      </div>
      <div className="card-nums">
        <span><span className="note">Day 1</span><b className={`num ${tone(d1)}`}>{pct(d1)}</b></span>
        <span><span className="note">Abnormal so far</span><b className={`num ${tone(ca)}`}>{pct(ca)}</b></span>
        <span><span className="note">Progress</span><b className="num">{e.day_count || 0}/5</b></span>
      </div>
      <div className="note">
        {e.results_filed_at ? `Filed ${fmtStamp(e.results_filed_at)} · reaction ${fmtDay(e.reaction_day)}` : e.meeting_date ? `Board meeting ${fmtDay(e.meeting_date)}` : ""}
      </div>
    </li>
  );
}

const byDayThenDate = (a, b) => (a.day_n ?? 0) - (b.day_n ?? 0) || (a.date || "").localeCompare(b.date || "");

function Detail({ e, onClose }) {
  const prices = [...(e.prices || [])].sort((a, b) => (a.day_n ?? 0) - (b.day_n ?? 0));
  const reasons = [...(e.reasons || [])].sort((a, b) => (a.day_n ?? 0) - (b.day_n ?? 0));
  const s = e.summary;
  return (
    <section className="panel" id="detail">
      <div className="detail">
        <div className="dhead">
          <div>
            <h2><span className="num">{e.symbol}</span>  {e.company}</h2>
            <div className="facts">
              <span>Sector index: {e.sector_index || "—"}</span>
              <span>Meeting: {fmtDay(e.meeting_date)}</span>
              <span>Filed: {fmtStamp(e.results_filed_at)}</span>
              <span>Reaction day: {fmtDay(e.reaction_day)}</span>
              <span>Base close: {isNum(e.prev_close) ? `₹${e.prev_close.toFixed(2)}` : "—"}{e.prev_close_date ? ` (${fmtDay(e.prev_close_date)})` : ""}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Pill status={e.status} />
            <button type="button" className="close" onClick={onClose}>Close</button>
          </div>
        </div>

        {s && (
          <div className="summary">
            <h3>5-day summary</h3>
            <div className="kv num">
              <span className={tone(s.cum_log_return)}>Total {pct(s.cum_log_return)}</span>
              <span className={tone(s.cum_abnormal)}>Abnormal {pct(s.cum_abnormal)}</span>
              <span>Sector {pct(s.cum_sector_return)}</span>
            </div>
            {s.verdict && <p>{s.verdict}</p>}
            {s.top_positive?.length > 0 && <p><b>Main positives: </b>{s.top_positive.join("; ")}</p>}
            {s.top_negative?.length > 0 && <p><b>Main negatives: </b>{s.top_negative.join("; ")}</p>}
          </div>
        )}

        <div className="dgrid">
          <div>
            <h3>Cumulative log return from base close</h3>
            <Chart prices={prices} label={e.symbol} sectorLabel={e.sector_index || "Sector index"} />
          </div>
          <div>
            <h3>Daily prices</h3>
            <div className="scroll">
              <table>
                <thead><tr><th>Day</th><th>Date</th><th className="n">Close ₹</th><th className="n">Stock</th><th className="n">Sector</th><th className="n">Nifty 50</th><th className="n">Abnormal</th></tr></thead>
                <tbody>
                  {prices.length === 0 && <tr><td colSpan={7} className="muted">No prices yet. The evening run adds one row per trading day.</td></tr>}
                  {prices.map((p) => (
                    <tr key={p.day_n}>
                      <td className="num">D{p.day_n}</td>
                      <td className="num">{fmtDay(p.date)}</td>
                      <td className="n">{isNum(p.close) ? p.close.toFixed(2) : "—"}</td>
                      {["log_return", "sector_log_return", "nifty_log_return", "abnormal"].map((k) => (
                        <td key={k} className={`n ${tone(p[k])}`}>{pct(p[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {e.outlook && (
          <div className="ol-detail">
            <h3>Our view to next results</h3>
            <OutlookCard e={e} compact />
            <p className="note">Model-generated research view, scored against the sector index. Not investment advice.</p>
          </div>
        )}

        <Fundamentals e={e} />

        <div>
          <h3>Reasons from news</h3>
          {reasons.length === 0 ? <p className="muted">No reasons collected yet.</p> : (
            <>
              <div className="scroll wide-only">
                <table>
                  <thead><tr><th>Day</th><th>Date</th><th></th><th>Category</th><th>Reason</th><th>Source</th><th>Matches numbers</th></tr></thead>
                  <tbody>{reasons.map((r, i) => <ReasonRow key={i} r={r} />)}</tbody>
                </table>
              </div>
              <ul className="cards narrow-only">{reasons.map((r, i) => <ReasonCard key={i} r={r} />)}</ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [season, setSeason] = useState("");
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("watch");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (s) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/radar${s ? `?season=${encodeURIComponent(s)}` : ""}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
      setData(j); setError(""); if (!s && j.season) setSeason(j.season);
    } catch (e) {
      setError(e.message || "Could not load the radar data.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(""); }, [load]);
  // /radar?stock=TCS_Q2FY27 opens that stock's detail (used by Past results)
  const [wanted, setWanted] = useState(null);
  useEffect(() => { try { setWanted(new URLSearchParams(window.location.search).get("stock")); } catch {} }, []);
  useEffect(() => {
    if (!wanted || !data?.events?.[wanted]) return;
    setSel(wanted); setWanted(null);
    setTimeout(() => document.getElementById("detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [wanted, data]);
  useEffect(() => { const t = setInterval(() => load(season), 5 * 60 * 1000); return () => clearInterval(t); }, [load, season]);

  const events = useMemo(() => Object.entries(data?.events || {}).map(([id, e]) => ({ ...e, id })), [data]);
  const runs = useMemo(() => {
    const out = [];
    for (const [date, d] of Object.entries(data?.runs || {})) for (const r of d.runs || []) out.push({ date, ...r });
    return out.sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""));
  }, [data]);
  const match = (e) => { const t = q.trim().toLowerCase(); return !t || (e.symbol || "").toLowerCase().includes(t) || (e.company || "").toLowerCase().includes(t); };

  const counts = { all: events.length, waiting: 0, tracking: 0, done: 0 };
  for (const e of events) if (counts[bucket(e.status)] != null) counts[bucket(e.status)]++;

  const rows = events
    .filter((e) => (filter === "all" || bucket(e.status) === filter) && match(e))
    .sort((a, b) => (b.reaction_day || b.meeting_date || "").localeCompare(a.reaction_day || a.meeting_date || "") || (a.symbol || "").localeCompare(b.symbol || ""));

  // Reasons tab: each stock's row, with its reasons under it (same order as the watchlist)
  const groups = events
    .filter((e) => match(e) && ((e.reasons || []).length > 0 || (e.day_count || 0) >= 1))
    .sort((a, b) => (b.reaction_day || b.meeting_date || "").localeCompare(a.reaction_day || a.meeting_date || "") || (a.symbol || "").localeCompare(b.symbol || ""))
    .map((e) => ({ e, reasons: [...e.reasons].sort(byDayThenDate) }));

  const selected = events.find((e) => e.id === sel);
  const last = runs[0];
  const open = (id) => { setSel(id); setTab("watch"); setTimeout(() => document.getElementById("detail")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50); };

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Radar</h1>
          <div className="meta">
            {data?.seasons?.length > 1 ? (
              <select className="season" value={season} onChange={(e) => { setSeason(e.target.value); setSel(null); load(e.target.value); }} aria-label="Season">
                {data.seasons.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : <span>Season {data?.season || "—"}</span>}
            <span>Nifty 500</span>
            <span>Log returns. Abnormal = stock minus its sector index.</span>
          </div>
        </div>
        <div className="right">
          <div className="sched" aria-label="Run schedule, IST, weekdays">
            <span className="slot"><b>08:45</b> find reporters</span>
            <span className="slot"><b>15:20</b> results check</span>
            <span className="slot"><b>20:50</b> prices · news</span>
          </div>
          <div className="lastrun">
            <span>{last ? <><span className={`dot ${last.status || ""}`} />Last run: {last.task} · {fmtStamp(last.started_at)} · {last.status}</> : <><span className="dot" />No runs yet</>}</span>
            <button type="button" className="refresh" onClick={() => load(season)} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
            <a className="refresh dl" href={`/api/export?tables=fundamentals&stocks=all&seasons=${season || ""}`}
              title="Every stock's Day 1 and Day 5 fundamentals tables, one row per metric, with stock name">Fundamentals CSV</a>
            <DownloadMenu season={season} seasons={data?.seasons || []} />
          </div>
        </div>
      </header>

      {error && <div className="banner">{error} Press Refresh to try again.</div>}

      <section className="counts" aria-label="Filter by status">
        {[["all", "All on radar"], ["waiting", "Waiting for results"], ["tracking", "Tracking (day 1–5)"], ["done", "Done, summary ready"]].map(([k, label]) => (
          <button key={k} type="button" className="count" aria-pressed={filter === k} onClick={() => { setFilter(k); setTab("watch"); }}>
            <span className="k">{label}</span><span className="v">{data ? counts[k] : "—"}</span>
          </button>
        ))}
      </section>

      <div className="bar">
        <div className="tabs" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <input id="q" className="search" type="search" placeholder="Search symbol or company" aria-label="Search symbol or company" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {tab === "watch" && (
        <>
          <section className="panel">
            <ul className="cards narrow-only">
              {rows.map((e) => (
                <StockCard key={e.id} e={e} selected={sel === e.id} onClick={() => (sel === e.id ? setSel(null) : open(e.id))} />
              ))}
            </ul>
            <div className="scroll wide-only">
              <table>
                <thead>{STOCK_HEAD}</thead>
                <tbody>
                  {rows.map((e) => (
                    <StockRow key={e.id} e={e} selected={sel === e.id} onClick={() => (sel === e.id ? setSel(null) : open(e.id))} />
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && (
              <div className="empty">
                {!data ? <b>Loading…</b> : events.length ? <b>Nothing matches this filter.</b> : <><b>No stocks on the radar yet.</b><span>The 8:45 am run adds Nifty 500 companies that report today.</span></>}
              </div>
            )}
          </section>
          {selected && <Detail e={selected} onClose={() => setSel(null)} />}
        </>
      )}

      {tab === "reasons" && (
        <section className="panel">
          <div className="scroll wide-only">
            <table className="grouped">
              <thead>{STOCK_HEAD}</thead>
              {groups.map(({ e, reasons }) => (
                <tbody key={e.id} className="group">
                  <StockRow e={e} onClick={() => open(e.id)} />
                  <tr className="sub">
                    <td colSpan={9}>
                      <Fundamentals e={e} />
                      {reasons.length > 0 && (
                        <>
                          <h3 className="fund-title">Reasons from news</h3>
                          <table className="subtable">
                            <thead><tr><th>Day</th><th>Date</th><th></th><th>Category</th><th>Reason</th><th>Source · published</th><th>Matches numbers</th></tr></thead>
                            <tbody>{reasons.map((r, i) => <ReasonRow key={i} r={r} />)}</tbody>
                          </table>
                        </>
                      )}
                    </td>
                  </tr>
                </tbody>
              ))}
            </table>
          </div>
          <div className="narrow-only">
            {groups.map(({ e, reasons }) => (
              <div key={e.id} className="group-card">
                <ul className="cards"><StockCard e={e} onClick={() => open(e.id)} /></ul>
                <div className="sub-cards sub-pad"><Fundamentals e={e} /></div>
                {reasons.length > 0 && <ul className="cards sub-cards">{reasons.map((r, i) => <ReasonCard key={i} r={r} />)}</ul>}
              </div>
            ))}
          </div>
          {groups.length === 0 && <div className="empty"><b>No reasons yet.</b><span>The evening run reads news for each stock on the radar and adds them here.</span></div>}
        </section>
      )}

      {tab === "outlook" && <Outlook events={events} match={match} onOpen={open} loaded={!!data} />}

      {tab === "hypo" && <Hypotheses windows={data?.hypotheses} onOpen={open} loaded={!!data} q={q} />}

      {tab === "runs" && (
        <section className="panel">
          <ul className="cards narrow-only">
            {runs.map((r, i) => (
              <li key={i} className="card">
                <div className="card-top"><b>{r.task}</b><span><span className={`dot ${r.status || ""}`} />{r.status}</span></div>
                <div className="note">{fmtStamp(r.started_at)}</div>
                {r.notes && <p className="card-text">{r.notes}</p>}
              </li>
            ))}
          </ul>
          <div className="scroll wide-only">
            <table>
              <thead><tr><th>Date</th><th>Run</th><th>Started</th><th>Result</th><th>Notes</th></tr></thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={i}>
                    <td className="num">{fmtDay(r.date)}</td><td>{r.task}</td><td className="num">{fmtStamp(r.started_at)}</td>
                    <td><span className={`dot ${r.status || ""}`} />{r.status}</td><td>{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {runs.length === 0 && <div className="empty"><b>No runs logged yet.</b><span>Every scheduled run adds a line here, including failures.</span></div>}
          <div className="exports">
            <span className="note">Download for Postgres or your LangGraph comparison:</span>
            {CSVS.map((n) => <a key={n} className="btn" href={`/api/csv/${n}${season ? `?season=${season}` : ""}`}>{n}.csv</a>)}
          </div>
        </section>
      )}
    </div>
  );
}
