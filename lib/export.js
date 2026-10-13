// Builds the downloadable tables from events.json / runs.json (server side).
// Same columns as the pipeline's CSVs, plus a leading "season" column so seasons can be combined.

export const TABLES = {
  events: ["event_id", "symbol", "company", "industry", "sector_index", "meeting_date", "purpose", "prev_close",
    "prev_close_date", "results_filed_at", "reaction_day", "status", "day_count", "cum_log_return", "cum_abnormal", "updated_at"],
  prices: ["event_id", "symbol", "company", "day_n", "date", "close", "prev_close", "log_return", "sector_log_return",
    "nifty_log_return", "abnormal", "source", "note"],
  reasons: ["event_id", "symbol", "company", "day_n", "date", "direction", "category", "reason", "source", "url",
    "matches_numbers", "published_at", "captured_at"],
  fundamentals: ["event_id", "symbol", "company", "sector_index", "results_filed_at", "view", "as_of", "statement", "metric",
    "basis", "value", "change", "unit", "direction", "sources", "note", "recorded_at"],
  summaries: ["event_id", "symbol", "company", "sector_index", "reaction_day", "cum_log_return", "cum_abnormal",
    "cum_sector_return", "top_positive", "top_negative", "verdict", "created_at"],
  outlook: ["event_id", "symbol", "company", "sector_index", "reaction_day", "written_at", "as_of", "horizon_end",
    "stance", "confidence", "thesis", "bull", "bull_odds", "base", "base_odds", "bear", "bear_odds", "watch", "catalysts",
    "risks", "from_date", "from_close", "from_sector", "last_date", "last_close", "last_sector", "stock_return",
    "sector_return", "excess", "track_status", "verdict"],
  run_log: ["date", "task", "started_at", "finished_at", "status", "notes"],
};

export const STOCK_SETS = {
  all: () => true,
  active: (e) => e.status === "waiting" || e.status === "tracking",
  past: (e) => e.status === "done",
};

function rowsFor(table, events, runs) {
  const ev = Object.entries(events || {}).sort(([a], [b]) => a.localeCompare(b)).map(([id, e]) => ({ ...e, event_id: id }));
  const who = (e) => ({ event_id: e.event_id, symbol: e.symbol, company: e.company });
  switch (table) {
    case "events": return ev;
    case "prices": return ev.flatMap((e) => (e.prices || []).map((p) => ({ ...p, ...who(e) })));
    case "reasons": return ev.flatMap((e) => (e.reasons || []).map((r) => ({ ...r, ...who(e) })));
    case "fundamentals":
      return ev.flatMap((e) => Object.entries(e.fundamentals || {}).sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([view, blk]) => (blk.rows || []).map((r) => ({
          ...r, ...who(e), sector_index: e.sector_index, results_filed_at: e.results_filed_at,
          view: view.toUpperCase(), as_of: blk.as_of, recorded_at: blk.recorded_at,
        }))));
    case "summaries":
      return ev.filter((e) => e.summary).map((e) => ({ ...e.summary, ...who(e), sector_index: e.sector_index, reaction_day: e.reaction_day }));
    case "outlook":
      return ev.filter((e) => e.outlook).map((e) => {
        const o = e.outlook, t = o.track || {}, sc = o.scenarios || {};
        return {
          ...who(e), sector_index: e.sector_index, reaction_day: e.reaction_day, ...o, ...t, track_status: t.status,
          bull: sc.bull?.text, bull_odds: sc.bull?.odds, base: sc.base?.text, base_odds: sc.base?.odds,
          bear: sc.bear?.text, bear_odds: sc.bear?.odds,
        };
      });
    case "run_log":
      return Object.entries(runs || {}).sort(([a], [b]) => a.localeCompare(b)).flatMap(([date, d]) => (d.runs || []).map((r) => ({ ...r, date })));
    default: return [];
  }
}

function cell(v) {
  if (v == null) return "";
  const s = Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// seasons: [{ season, events, runs }]. Returns CSV text with a leading season column.
export function buildCsv(table, seasons, stockSet = "all") {
  const cols = ["season", ...TABLES[table]];
  const keep = STOCK_SETS[stockSet] || STOCK_SETS.all;
  const lines = [cols.join(",")];
  for (const { season, events, runs } of seasons) {
    const picked = Object.fromEntries(Object.entries(events || {}).filter(([, e]) => keep(e)));
    for (const r of rowsFor(table, picked, runs)) lines.push(cols.map((c) => cell(c === "season" ? season : r[c])).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel reads ₹ and other symbols correctly
}
