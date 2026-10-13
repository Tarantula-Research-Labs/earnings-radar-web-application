export const isNum = (v) => typeof v === "number" && Number.isFinite(v);

export function pct(v) {
  if (!isNum(v)) return "—";
  const x = v * 100;
  return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(2) + "%";
}

export const tone = (v) => (!isNum(v) || v === 0 ? "" : v > 0 ? "up" : "down");

export function fmtDay(s) {
  if (!s) return "—";
  const d = new Date(String(s).slice(0, 10) + "T00:00:00+05:30");
  if (isNaN(d)) return s;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

export function fmtStamp(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}

export const STATUS = { waiting: "Waiting", tracking: "Tracking", done: "Done", no_results: "No results", postponed: "Postponed" };
export const bucket = (s) => (s === "no_results" || s === "postponed" ? "waiting" : s);

export function day1(prices, key) {
  const p = (prices || []).find((p) => p.day_n === 1);
  return p && isNum(p[key]) ? p[key] : null;
}

export function cum(prices, key) {
  let s = 0, n = 0;
  for (const p of prices || []) if (p.day_n >= 1 && isNum(p[key])) { s += p[key]; n++; }
  return n ? s : null;
}
