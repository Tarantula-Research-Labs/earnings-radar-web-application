import { fmtDay } from "@/lib/format";

const VIEWS = [
  ["d1", "Day 1 view", "What sources reported by the reaction day"],
  ["d5", "Day 5 view", "Everything reported up to day 5, including later broker notes"],
];

function change(r) {
  if (typeof r.change !== "number") return "—";
  const sign = r.change > 0 ? "+" : r.change < 0 ? "−" : "";
  const v = Math.abs(r.change);
  return r.unit === "bps" ? `${sign}${v.toFixed(0)} bps` : `${sign}${v.toFixed(1)}%`;
}
const dirCls = (d) => (d === "positive" ? "up" : d === "negative" ? "down" : "");
const dirTxt = (d) => (d === "positive" ? "Positive" : d === "negative" ? "Negative" : "Neutral");

function View({ blk, title, hint, pending }) {
  const rows = blk?.rows || [];
  return (
    <div className="fview">
      <div className="fview-head">
        <h3>{title}</h3>
        <span className="note">{blk ? `as of ${fmtDay(blk.as_of)}` : hint}</span>
      </div>
      {!blk ? (
        <p className="note fview-empty">{pending}</p>
      ) : rows.length === 0 ? (
        <p className="note fview-empty">The sources gave no figures for this view.</p>
      ) : (
        <>
          <div className="scroll wide-only">
            <table className="ftable">
              <thead><tr><th>Statement</th><th>Metric</th><th>Effect</th><th className="n">Change</th><th className="n">Value</th><th>Sources</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} title={r.note || undefined}>
                    <td className="note">{r.statement}</td>
                    <td>{r.metric}{r.note && <span className="fnote">{r.note}</span>}</td>
                    <td className={dirCls(r.direction)}>{dirTxt(r.direction)}</td>
                    <td className={`n ${dirCls(r.direction)}`}>{change(r)}{r.basis && <span className="fbasis">{r.basis}</span>}</td>
                    <td className="n">{r.value || "—"}</td>
                    <td className="note">{(r.sources || []).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="cards narrow-only fcards">
            {rows.map((r, i) => (
              <li key={i} className="card">
                <div className="card-top">
                  <span><b>{r.metric}</b> <span className="note">· {r.statement}</span></span>
                  <span className={`num ${dirCls(r.direction)}`}>{change(r)}</span>
                </div>
                <div className="card-meta">
                  <span className={dirCls(r.direction)}>{dirTxt(r.direction)}</span>
                  {r.basis && <span className="note">{r.basis}</span>}
                  {r.value && <span className="num">{r.value}</span>}
                  {r.sources?.length > 0 && <span className="note">{r.sources.join(", ")}</span>}
                </div>
                {r.note && <div className="note">{r.note}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// Reported P&L, balance sheet and cash-flow figures as the sources stated them, Day 1 and Day 5.
export default function Fundamentals({ e }) {
  const f = e.fundamentals || {};
  const pending = {
    d1: (e.day_count || 0) >= 1 ? "Written on tonight's evening run." : "Appears after the reaction-day close.",
    d5: (e.day_count || 0) >= 5 ? "Written on tonight's evening run." : `Appears on the evening of day 5 (now ${e.day_count || 0}/5).`,
  };
  return (
    <section className="fund">
      <h3 className="fund-title">Fundamentals from the results</h3>
      <div className="fgrid">
        {VIEWS.map(([k, title, hint]) => <View key={k} blk={f[k]} title={title} hint={hint} pending={pending[k]} />)}
      </div>
    </section>
  );
}
