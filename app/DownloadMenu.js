"use client";
import { useEffect, useRef, useState } from "react";

const TABLE_OPTS = [
  ["events", "Stocks", "One row per stock: dates, status, totals"],
  ["prices", "Daily prices", "D0–D5 closes and returns"],
  ["reasons", "Reasons", "News and broker reasons"],
  ["fundamentals", "Fundamentals", "Day 1 and Day 5 tables"],
  ["summaries", "5-day summaries", "Verdict, what helped, what hurt"],
  ["run_log", "Run log", "Every scheduled run"],
];
const STOCK_OPTS = [["all", "All stocks"], ["active", "Being tracked now"], ["past", "Past results only"]];

// "Download" button with a small form: which tables, which stocks, which seasons.
export default function DownloadMenu({ season, seasons = [], defaultStocks = "all", defaultTables = ["reasons", "fundamentals", "summaries"] }) {
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState(new Set(defaultTables));
  const [stocks, setStocks] = useState(defaultStocks);
  const [scope, setScope] = useState("current");
  const box = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (ev) => { if (box.current && !box.current.contains(ev.target)) setOpen(false); };
    const esc = (ev) => ev.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const toggle = (k) => setTables((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const list = TABLE_OPTS.map(([k]) => k).filter((k) => tables.has(k));
  const href = `/api/export?tables=${list.join(",")}&stocks=${stocks}&seasons=${scope === "all" ? "all" : season || ""}`;

  return (
    <div className="dlm" ref={box}>
      <button type="button" className="refresh dl" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Download ▾</button>
      {open && (
        <div className="dlm-panel" role="dialog" aria-label="Download data">
          <fieldset>
            <legend>Tables</legend>
            {TABLE_OPTS.map(([k, label, hint]) => (
              <label key={k} className="dlm-opt">
                <input type="checkbox" checked={tables.has(k)} onChange={() => toggle(k)} />
                <span><b>{label}</b><span className="note">{hint}</span></span>
              </label>
            ))}
            <div className="dlm-quick">
              <button type="button" onClick={() => setTables(new Set(TABLE_OPTS.map(([k]) => k)))}>Select all</button>
              <button type="button" onClick={() => setTables(new Set())}>Clear</button>
            </div>
          </fieldset>
          <fieldset>
            <legend>Stocks</legend>
            {STOCK_OPTS.map(([k, label]) => (
              <label key={k} className="dlm-opt inline">
                <input type="radio" name="dlm-stocks" checked={stocks === k} onChange={() => setStocks(k)} />{label}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Seasons</legend>
            <label className="dlm-opt inline">
              <input type="radio" name="dlm-scope" checked={scope === "current"} onChange={() => setScope("current")} />
              {season ? season.replace(/^(Q\d)(FY\d+)$/, "$1 $2") : "This season"}
            </label>
            <label className="dlm-opt inline">
              <input type="radio" name="dlm-scope" checked={scope === "all"} onChange={() => setScope("all")} />
              All seasons{seasons.length > 1 ? ` (${seasons.length})` : ""}
            </label>
          </fieldset>
          <div className="dlm-foot">
            <span className="note">{list.length === 0 ? "Pick at least one table." : list.length === 1 ? "One CSV file." : `ZIP with ${list.length} CSV files.`}</span>
            {list.length > 0
              ? <a className="cta small" href={href} onClick={() => setOpen(false)}>Download</a>
              : <span className="cta small disabled" aria-disabled="true">Download</span>}
          </div>
        </div>
      )}
    </div>
  );
}
