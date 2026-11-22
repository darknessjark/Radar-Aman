"use client";
import { riskColor, riskCls, verdictKey, fmtDate, evidenceList, platformReport } from "@/lib/report";
import { AREA_KEYS, KEY_KIND, TACTIC_EN, platId } from "@/lib/i18n";
import { useLang } from "./Lang";
import Dial from "./Dial";

const LC = { red: "var(--red)", amber: "var(--amber)", green: "var(--green)", none: "var(--line)" };
const ENT = ["phones", "ibans", "domains", "urls", "accounts", "emails"];
const CONF = { "عالية": "cHigh", "متوسطة": "cMid", "منخفضة": "cLow" };

function Deep({ d, busy, t }) {
  if (busy || d?.status === "running") return (
    <section className="panel run"><h3><span className="spin" />{t("deepRun")}</h3><p className="note">{t("deepRunD")}</p></section>
  );
  if (!d) return null;
  if (d.status === "failed") return <section className="panel" style={{ borderColor: "var(--red)" }}><p style={{ margin: 0 }}>{d.summary}</p></section>;
  return (
    <section className="panel">
      <h3>{t("deepT")}{typeof d.score_after === "number" && <span className={`pill ${riskCls(d.score_after)}`}>{t("scoreAfter", { n: t.n(d.score_after) })}</span>}</h3>
      {d.summary && <p style={{ marginTop: 0 }}>{d.summary}</p>}
      <ul className="flags">
        {(d.findings || []).map((f, i) => (
          <li key={i} style={{ borderInlineStartColor: LC[f.level] || "var(--line)" }}>
            <b>{AREA_KEYS[f.area] ? t(AREA_KEYS[f.area]) : f.area}: {f.title}</b><span>{f.detail}</span>
          </li>
        ))}
      </ul>
      {(d.sources || []).length > 0 && (
        <div className="note" style={{ marginTop: 8 }}>{t("sourcesT")}:{" "}
          {d.sources.map((s, i) => <span key={i}><a href={s} target="_blank" rel="noopener noreferrer" className="ltr">{s.replace(/^https?:\/\//, "").slice(0, 48)}</a>{i < d.sources.length - 1 ? " · " : ""}</span>)}
        </div>
      )}
      {d.completedAt && <div className="note">{t("doneAt")}: <span className="ltr">{fmtDate(d.completedAt)}</span></div>}
    </section>
  );
}

function Kit({ c, t, onCopy }) {
  const ev = evidenceList(c), id = platId(c.platform);
  return (
    <section className="panel kit">
      <h3>{t("kitT")}</h3>
      <p className="note" style={{ marginTop: 0 }}>{t("kitD")}</p>
      <div className="grid2">
        <div><div className="lbl">{t("kitSteps")}</div><p style={{ margin: 0 }}>{t("step_" + id)}</p></div>
        <div><div className="lbl">{t("kitEvid")}</div>
          {ev.length ? <ol className="evl" dir="auto">{ev.map((x, i) => <li key={i}>{x}</li>)}</ol> : <p className="note" style={{ margin: 0 }}>{t("kitNone")}</p>}
        </div>
      </div>
      {ev.length > 0 && <div className="row"><button className="btn sm" onClick={() => onCopy(platformReport(c), t("copied"))}>{t("kitCopy")}</button></div>}
      <p className="note" style={{ marginBottom: 0 }}>{t("kitNote")}</p>
    </section>
  );
}

export default function ResultView({ c, links = [], onDeep, deepBusy, onCopy, onCopyText, extra }) {
  const { t, lang } = useLang();
  const r = c.result || {};
  const v = c.deep?.status === "done" && typeof c.deep.score_after === "number" ? c.deep.score_after : r.risk_score ?? 0;
  const col = riskColor(v), p = r.price_analysis || {};
  const gap = Math.max(0, Math.min(100, Math.round(+p.gap_percent || 0)));
  const lc = r.link_check || [];
  const ents = ENT.filter(k => (r.entities?.[k] || []).length);
  const canDeep = onDeep && !deepBusy && c.deep?.status !== "running";
  const conf = CONF[r.confidence] ? t(CONF[r.confidence]) : r.confidence || "—";
  return (
    <article className="sheet">
      <div className="sheet-head">
        <span className="mono">CASE {c.id.slice(0, 8).toUpperCase()}</span>
        <span className="note ltr">{fmtDate(c.createdAt)}</span>
      </div>
      <div className="verdict-row">
        <Dial value={v} label={t.n(v)} color={col} />
        <div className="verdict-copy">
          <div className="verdict" style={{ color: col }}>{t(verdictKey(v))}</div>
          <div className="pills">
            {r.scam_type && r.scam_type !== "لا يوجد" && <span className={`pill ${riskCls(v)}`}>{r.scam_type}</span>}
            {r.impersonated_entity && <span className="pill">{t("impersonates", { x: r.impersonated_entity })}</span>}
            <span className="pill">{t("confidence")}: {conf}</span>
            <span className="pill">{t("p_" + platId(c.platform))}</span>
            {c.source === "رصد آلي" && <span className="pill">{t("auto")}</span>}
          </div>
          <p className="summary" dir="auto">{c.deep?.status === "done" && c.deep.summary ? c.deep.summary : r.summary}</p>
        </div>
      </div>

      {links.length > 0 && (
        <div className="linkwarn">
          <b>{t("linked", { n: t.n(links.length) })}</b>
          {links[0].shared && <div className="note">{t("via")}: {[...new Set(links.flatMap(l => l.shared || []))].map((k, i) => <span key={i}>{t(KEY_KIND[k.split("|")[0]] || "k_site")} <code>{k.split("|")[0] === "صورة" ? t("k_imgdup") : k.split("|")[1]}</code> </span>)}</div>}
        </div>
      )}

      <Deep d={c.deep} busy={deepBusy} t={t} />

      {p.advertised && p.market_estimate && (
        <section className="panel">
          <h3>{t("priceT")}{gap > 0 && <span className={`pill ${gap >= 50 ? "red" : gap >= 25 ? "amber" : "green"}`}>{t("below", { n: t.n(gap) })}</span>}</h3>
          <div className="grid2">
            <div><div className="lbl">{t("advertised")}</div><div className="big" dir="auto">{p.advertised}</div></div>
            <div><div className="lbl">{t("typical")}</div><div className="big" dir="auto">{p.market_estimate}</div></div>
          </div>
          {p.note && <p className="note" dir="auto" style={{ marginBottom: 0 }}>{p.note}</p>}
        </section>
      )}

      {(r.tactics || []).length > 0 && <div className="pills" style={{ margin: "14px 0 0" }}><span className="lbl" style={{ margin: 0 }}>{t("tactics")}</span> {r.tactics.map((x, i) => <span key={i} className="pill red">{lang === "en" ? TACTIC_EN[x] || x : x}</span>)}</div>}

      {(r.account_analysis || r.image_analysis) && (
        <div className={"grid2" + (r.account_analysis && r.image_analysis ? "" : " one")} style={{ marginTop: 14 }}>
          {r.account_analysis && <section className="panel" style={{ margin: 0 }}><h3>{t("accountT")}</h3><p style={{ margin: 0 }} dir="auto">{r.account_analysis}</p></section>}
          {r.image_analysis && <section className="panel" style={{ margin: 0 }}><h3>{t("imageT")}</h3><p style={{ margin: 0 }} dir="auto">{r.image_analysis}</p></section>}
        </div>
      )}

      {lc.length > 0 && (
        <section className="panel">
          <h3>{t("linkT")}</h3>
          <ul className="flags">{lc.map((l, i) => {
            const lv = l.flags.find(f => f.level === "red") ? "red" : l.flags.find(f => f.level === "amber") ? "amber" : l.flags.find(f => f.level === "green") ? "green" : "none";
            return <li key={i} style={{ borderInlineStartColor: LC[lv] }}><b className="ltr">{l.domain}</b>{l.flags.map((f, j) => <span key={j} dir="auto">{lang === "ar" ? f.t : f.e || f.t}</span>)}</li>;
          })}</ul>
        </section>
      )}

      <div className="grid2" style={{ marginTop: 14 }}>
        <section className="panel" style={{ margin: 0 }}>
          <h3>{t("flagsT")}</h3>
          {(r.red_flags || []).length ? <ul className="flags">{r.red_flags.map((f, i) => <li key={i}><b dir="auto">{f.title}</b><span dir="auto">{f.detail}</span></li>)}</ul> : <p className="note" style={{ margin: 0 }}>{t("noFlags")}</p>}
          {(r.positive_signals || []).length > 0 && (<><h3 style={{ marginTop: 16 }}>{t("safeT")}</h3><ul className="flags">{r.positive_signals.map((f, i) => <li key={i} style={{ borderInlineStartColor: "var(--green)" }}><span dir="auto">{f}</span></li>)}</ul></>)}
        </section>
        <section className="panel" style={{ margin: 0 }}>
          <h3>{t("entT")}</h3>
          {ents.length ? ents.map(k => <div key={k} className="ent"><span className="lbl">{t("e_" + k)}</span>{r.entities[k].map((x, i) => <code key={i}>{x}</code>)}</div>) : <p className="note" style={{ margin: 0 }}>{t("noEnt")}</p>}
          <h3 style={{ marginTop: 16 }}>{t("officerT")}</h3><p style={{ margin: 0 }} dir="auto">{r.officer_action}</p>
          <h3 style={{ marginTop: 16 }}>{t("adviceT")}</h3><p style={{ margin: 0 }} dir="auto">{r.citizen_advice}</p>
        </section>
      </div>

      <Kit c={c} t={t} onCopy={onCopyText || (() => {})} />

      <div className="evid">SHA-256 {c.hash || "—"}</div>
      <div className="row">
        {canDeep && <button className="btn" onClick={onDeep}>{c.deep?.status === "done" ? t("deepAgain") : t("deepBtn")}</button>}
        {onCopy && <button className="btn ghost" onClick={onCopy}>{t("copyReport")}</button>}
        {extra}
      </div>
    </article>
  );
}
