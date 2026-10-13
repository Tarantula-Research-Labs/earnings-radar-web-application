"use client";
import { useEffect, useRef, useState } from "react";
import { isNum, pct, fmtDay } from "@/lib/format";

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 0.01)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

// Cumulative log return from the base close (D0): stock vs its sector index, days 0-5.
export default function Chart({ prices, label, sectorLabel }) {
  const host = useRef(null);
  const [w, setW] = useState(520);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!host.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(host.current);
    return () => ro.disconnect();
  }, []);

  const s1 = [{ x: 0, y: 0 }], s2 = [{ x: 0, y: 0 }];
  let a = 0, b = 0;
  for (const p of (prices || []).filter((p) => p.day_n >= 1).sort((x, y) => x.day_n - y.day_n)) {
    if (isNum(p.log_return)) { a += p.log_return; s1.push({ x: p.day_n, y: a, date: p.date }); }
    if (isNum(p.sector_log_return)) { b += p.sector_log_return; s2.push({ x: p.day_n, y: b, date: p.date }); }
  }

  if (s1.length < 2) {
    return <div ref={host}><p className="muted">The chart appears after the reaction-day close is recorded.</p></div>;
  }

  const H = 220, m = { l: 52, r: 14, t: 10, b: 28 };
  const ys = s1.concat(s2).map((p) => p.y);
  let lo = Math.min(0, ...ys), hi = Math.max(0, ...ys);
  const pad = (hi - lo) * 0.12 || 0.01; lo -= pad; hi += pad;
  const X = (v) => m.l + ((w - m.l - m.r) * v) / 5;
  const Y = (v) => m.t + ((H - m.t - m.b) * (hi - v)) / (hi - lo);
  const step = niceStep((hi - lo) / 4);
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-12; v += step) ticks.push(v);
  const line = (s) => s.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ");

  function onMove(e) {
    const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const sx = ((e.clientX - r.left) * w) / r.width;
    const d = Math.max(0, Math.min(5, Math.round((sx - m.l) / ((w - m.l - m.r) / 5))));
    const p1 = s1.find((p) => p.x === d), p2 = s2.find((p) => p.x === d);
    setHover(p1 || p2 ? { d, p1, p2, px: (X(d) * r.width) / w } : null);
  }

  const last1 = s1.at(-1), last2 = s2.at(-1);
  return (
    <div ref={host} className="chartbox">
      <div className="legend">
        <span style={{ "--c": "var(--s1)" }}>{label}</span>
        <span style={{ "--c": "var(--s2)" }}>{sectorLabel}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" role="img" aria-label="Cumulative log return, stock versus sector index, days 0 to 5">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={w - m.r} y1={Y(v)} y2={Y(v)} stroke={Math.abs(v) < 1e-12 ? "var(--ink-3)" : "var(--grid)"} strokeWidth="1" />
            <text x={m.l - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)" fontFamily="var(--mono)">{pct(v)}</text>
          </g>
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <text key={i} x={X(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--ink-3)" fontFamily="var(--mono)">D{i}</text>
        ))}
        {s2.length > 1 && <polyline points={line(s2)} fill="none" stroke="var(--s2)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        <polyline points={line(s1)} fill="none" stroke="var(--s1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {s2.length > 1 && <circle cx={X(last2.x)} cy={Y(last2.y)} r="4" fill="var(--s2)" stroke="var(--panel)" strokeWidth="2" />}
        <circle cx={X(last1.x)} cy={Y(last1.y)} r="4" fill="var(--s1)" stroke="var(--panel)" strokeWidth="2" />
        {hover && <line x1={X(hover.d)} x2={X(hover.d)} y1={m.t} y2={H - m.b} stroke="var(--ink-3)" strokeDasharray="3 3" />}
        <rect x={m.l} y={m.t} width={w - m.l - m.r} height={H - m.t - m.b} fill="transparent"
          onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {hover && (
        <div className="tip" style={{ left: Math.min(Math.max(0, hover.px + 10), w - 170) }}>
          <div>Day {hover.d}{hover.p1?.date ? ` · ${fmtDay(hover.p1.date)}` : ""}</div>
          <div className="num">{label} {pct(hover.p1?.y)}</div>
          <div className="num">Sector {pct(hover.p2?.y)}</div>
          {hover.p1 && hover.p2 && <div className="num">Gap {pct(hover.p1.y - hover.p2.y)}</div>}
        </div>
      )}
    </div>
  );
}
