import { isNum, pct } from "@/lib/format";

// Small cumulative-return line: stock vs its sector index, D0 to D5.
export default function Spark({ prices, width = 132, height = 40 }) {
  const s1 = [0], s2 = [0];
  let a = 0, b = 0;
  for (const p of (prices || []).filter((p) => p.day_n >= 1).sort((x, y) => x.day_n - y.day_n)) {
    a += isNum(p.log_return) ? p.log_return : 0; s1.push(a);
    b += isNum(p.sector_log_return) ? p.sector_log_return : 0; s2.push(b);
  }
  if (s1.length < 2) return null;
  const all = s1.concat(s2);
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  const pad = (hi - lo) * 0.1 || 0.005; lo -= pad; hi += pad;
  const X = (i) => 3 + ((width - 6) * i) / 5;
  const Y = (v) => 3 + ((height - 6) * (hi - v)) / (hi - lo);
  const pts = (s) => s.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="spark" role="img"
      aria-label={`Five-day path: stock ${pct(s1.at(-1))}, sector ${pct(s2.at(-1))}`}>
      <line x1="0" x2={width} y1={Y(0)} y2={Y(0)} stroke="var(--line)" strokeWidth="1" />
      <polyline points={pts(s2)} fill="none" stroke="var(--s2)" strokeWidth="1.5" strokeLinejoin="round" />
      <polyline points={pts(s1)} fill="none" stroke="var(--s1)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={X(s1.length - 1)} cy={Y(s1.at(-1))} r="2.5" fill="var(--s1)" />
    </svg>
  );
}
