"use client";
import { useState } from "react";
import { pct, tone, fmtDay, fmtStamp, isNum } from "@/lib/format";

// The radar's own view of each stock until its next results: written once after day 5 by the
// evening run, never edited, and scored every evening against the stock's sector index.

const STANCE = { positive: "Positive", neutral: "Neutral", negative: "Negative" };
const SCEN = [["bull", "Bull"], ["base", "Base"], ["bear", "Bear"]];

export function verdictText(o) {
  const t = o?.track || {};
  const fin = t.status === "final";
  if (!t.verdict) return { txt: t.from_close ? "Scoring from the next close" : "Not scored yet", cls: "" };
  if (t.verdict === "on_track") return { txt: fin ? "Right" : "On track", cls: "up" };
  if (t.verdict === "off_track") return { txt: fin ? "Wrong" : "Off track", cls: "down" };
  return { txt: "Too close to call", cls: "" };
}

function elapsed(o) {
  const t = o.track || {};
  const a = Date.parse(t.from_date || o.as_of), b = Date.parse(o.horizon_end), c = Date.parse(t.last_date || t.from_date || o.as_of);
  if (!a || !b || b <= a) return 0;
  return Math.max(0, Math.min(1, ((c || a) - a) / (b - a)));
}

function Stance({ s }) {
  return <span className={`stance ${s || ""}`}>{STANCE[s] || "—"}</span>;
}

function List({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3>{title}</h3>
      <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

export function OutlookCard({ e, onOpen, compact }) {
  const o = e.outlook;
  const t = o.track || {};
  const v = verdictText(o);
  const done = elapsed(o);
  return (
    <article className={`panel ol ${compact ? "compact" : ""}`}>
      {!compact && (
        <header className="ol-head">
          <div className="result-id">
            {onOpen ? <button type="button" className="sym" onClick={() => onOpen(e.id)}>{e.symbol}</button> : <span className="sym">{e.symbol}</span>}
            <span className="co">{e.company}</span>
          </div>
          <div className="ol-tags">
            <Stance s={o.stance} />
            <span className="pill">{o.confidence || "low"} confidence</span>
          </div>
        </header>
      )}
      {compact && (
        <div className="ol-tags"><Stance s={o.stance} /><span className="pill">{o.confidence || "low"} confidence</span></div>
      )}
      <p className="note ol-when">
        vs {e.sector_index || "sector"} · from day-5 close {fmtDay(o.as_of)} to next results ≈ {fmtDay(o.horizon_end)} · written {fmtStamp(o.written_at)}
      </p>

      <p className="ol-thesis">{o.thesis}</p>

      <div className="ol-scen">
        {SCEN.map(([k, label]) => {
          const s = o.scenarios?.[k];
          if (!s?.text) return null;
          return (
            <div key={k} className={`scen ${k}`}>
              <div className="scen-top">
                <b>{label}</b>
                {isNum(s.odds) && <span className="num">{s.odds}%</span>}
              </div>
              {isNum(s.odds) && <span className="scen-bar"><i style={{ width: `${s.odds}%` }} /></span>}
              <p>{s.text}</p>
            </div>
          );
        })}
      </div>

      {(o.watch?.length > 0 || o.catalysts?.length > 0 || o.risks?.length > 0) && (
        <div className="ol-lists">
          <List title="Watch" items={o.watch} />
          <List title="Catalysts" items={o.catalysts} />
          <List title="Risks" items={o.risks} />
        </div>
      )}

      <div className="ol-track">
        <div className="ol-track-top">
          <h3>Track record</h3>
          <span className={`ol-verdict ${v.cls}`}>{v.txt}{t.status === "final" ? " · final" : ""}</span>
        </div>
        <dl className="ol-nums">
          <div><dt>Stock</dt><dd className={`num ${tone(t.stock_return)}`}>{pct(t.stock_return)}</dd></div>
          <div><dt>Sector</dt><dd className={`num ${tone(t.sector_return)}`}>{pct(t.sector_return)}</dd></div>
          <div><dt>Stock − sector</dt><dd className={`num ${tone(t.excess)}`}>{pct(t.excess)}</dd></div>
        </dl>
        <div className="ol-time" aria-label={`${Math.round(done * 100)}% of the horizon has passed`}>
          <span className="ol-time-bar"><i style={{ width: `${done * 100}%` }} /></span>
          <span className="note">
            {t.last_date ? `Last close ${fmtDay(t.last_date)}` : "Waiting for the first close"} · {Math.round(done * 100)}% of the way to next results
          </span>
        </div>
        {t.note && <p className="note warn-text">{t.note}</p>}
      </div>
    </article>
  );
}

function Record({ list }) {
  const fin = list.filter((e) => e.outlook.track?.status === "final");
  const open = list.filter((e) => e.outlook.track?.status !== "final");
  const right = fin.filter((e) => e.outlook.track?.verdict === "on_track").length;
  const onTrack = open.filter((e) => e.outlook.track?.verdict === "on_track").length;
  const offTrack = open.filter((e) => e.outlook.track?.verdict === "off_track").length;
  const by = (s) => list.filter((e) => e.outlook.stance === s).length;
  return (
    <section className="figures small ol-record" aria-label="Outlook track record">
      <div><span className="fig num">{list.length}</span><span className="fig-k">outlooks · {by("positive")} positive · {by("neutral")} neutral · {by("negative")} negative</span></div>
      <div><span className="fig num up">{onTrack}</span><span className="fig-k">open and on track</span></div>
      <div><span className="fig num down">{offTrack}</span><span className="fig-k">open and off track</span></div>
      <div>
        <span className="fig num">{fin.length ? `${Math.round((right / fin.length) * 100)}%` : "—"}</span>
        <span className="fig-k">{fin.length ? `right · ${right} of ${fin.length} scored at next results` : "hit rate · none reached next results yet"}</span>
      </div>
    </section>
  );
}

const FILTERS = [["all", "All"], ["positive", "Positive"], ["neutral", "Neutral"], ["negative", "Negative"]];

export default function Outlook({ events, match, onOpen, loaded }) {
  const [f, setF] = useState("all");
  const all = events.filter((e) => e.outlook);
  const list = all
    .filter((e) => match(e) && (f === "all" || e.outlook.stance === f))
    .sort((a, b) => (b.outlook.as_of || "").localeCompare(a.outlook.as_of || "") || (a.symbol || "").localeCompare(b.symbol || ""));
  const due = events.filter((e) => !e.outlook && (e.day_count || 0) >= 5);

  return (
    <section className="ol-wrap">
      <p className="ol-disclaimer">
        <b>Our view to next results.</b> After a stock finishes its five days, the evening run writes a research view of
        how it may do against its sector index until its next quarterly results, from the news, fundamentals and broker
        notes it collected. It is model-generated, written once and never edited, and scored every evening so you can
        see how often it is right. It is not investment advice or a recommendation to buy or sell.
      </p>

      <Record list={all} />

      <div className="controls">
        <div className="seg" role="group" aria-label="Stance">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={f === k} onClick={() => setF(k)}>{label}</button>
          ))}
        </div>
        <span className="note">
          Right when: positive beats the sector by over 2%, negative trails it by over 2%, neutral stays within 3%.
        </span>
      </div>

      {due.length > 0 && (
        <p className="note">Outlook due on the next evening run: {due.map((e) => e.symbol).join(", ")}</p>
      )}

      {list.length > 0 ? (
        <div className="result-list">{list.map((e) => <OutlookCard key={e.id} e={e} onOpen={onOpen} />)}</div>
      ) : (
        <div className="panel empty">
          {!loaded ? <b>Loading…</b> : all.length ? <b>Nothing matches this filter.</b> : (
            <>
              <b>No outlooks yet.</b>
              <span>The evening run writes one for each stock after its fifth trading day.</span>
            </>
          )}
        </div>
      )}
    </section>
  );
}
