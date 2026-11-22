"use client";
import { riskColor, riskCls, toAr, fmtDate } from "@/lib/report";

const AREA_ICON = { "الحساب": "👤", "الرابط": "🔗", "الصورة": "🖼️", "السعر": "💰", "إعلانات أخرى": "📢", "شكاوى": "⚠️" };
const LC = { red: "var(--red)", amber: "var(--amber)", green: "var(--green)", none: "var(--line)" };
const ENT = [["phones", "أرقام الهواتف"], ["ibans", "حسابات بنكية (IBAN)"], ["domains", "مواقع / نطاقات"], ["urls", "روابط"], ["accounts", "حسابات تواصل"], ["emails", "بريد إلكتروني"]];

function Deep({ d, busy }) {
  if (busy || d?.status === "running") return (
    <div className="box" style={{ marginTop: 14, borderColor: "var(--blue)" }}>
      <span className="spin" style={{ color: "var(--blue)" }} /> <b>جاري الفحص المعمّق...</b>
      <div className="note">يبحث في الإنترنت عن الحساب والأرقام وسعر السوق والإعلانات المتكررة والشكاوى. يستغرق عادة من دقيقة إلى دقيقتين.</div>
    </div>
  );
  if (!d) return null;
  if (d.status === "failed") return <div className="box" style={{ marginTop: 14, borderColor: "var(--red)" }}>{d.summary}</div>;
  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>🔎 نتائج الفحص المعمّق{" "}
        {typeof d.score_after === "number" && <span className={`pill ${riskCls(d.score_after)}`}>الدرجة بعد الفحص: {toAr(d.score_after)}</span>}
      </h3>
      {d.summary && <p style={{ margin: "0 0 10px" }}>{d.summary}</p>}
      <ul className="flags">
        {(d.findings || []).map((f, i) => (
          <li key={i} style={{ borderInlineStartColor: LC[f.level] || "var(--line)" }}>
            <b>{AREA_ICON[f.area] || "•"} {f.area} — {f.title}</b><span>{f.detail}</span>
          </li>
        ))}
      </ul>
      {(d.sources || []).length > 0 && (
        <div className="note" style={{ marginTop: 6 }}>المصادر:{" "}
          {d.sources.map((s, i) => <span key={i}><a href={s} target="_blank" rel="noopener noreferrer" style={{ direction: "ltr", display: "inline-block" }}>{s.replace(/^https?:\/\//, "").slice(0, 48)}</a>{i < d.sources.length - 1 ? " · " : ""}</span>)}
        </div>
      )}
      {d.completedAt && <div className="note">اكتمل: {fmtDate(d.completedAt)}</div>}
    </div>
  );
}

export default function ResultView({ c, links = [], onDeep, deepBusy, onCopy, extra }) {
  const r = c.result || {};
  const v = r.risk_score ?? 0, col = riskColor(v);
  const p = r.price_analysis || {};
  const gap = Math.max(0, Math.min(100, Math.round(+p.gap_percent || 0)));
  const lc = r.link_check || [];
  const ents = ENT.filter(([k]) => (r.entities?.[k] || []).length);
  const canDeep = onDeep && !deepBusy && c.deep?.status !== "running";
  return (
    <div className="card">
      <div className="rhead">
        <div className="gauge" style={{ background: `conic-gradient(${col} ${v}%, #24304d 0)` }}><div style={{ color: col }}>{toAr(v)}</div></div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="verdict" style={{ color: col }}>{r.verdict}</div>
          <div>
            {r.scam_type && r.scam_type !== "لا يوجد" && <span className={`pill ${riskCls(v)}`}>{r.scam_type}</span>}
            {r.impersonated_entity && <span className="pill gold">ينتحل: {r.impersonated_entity}</span>}
            <span className="pill">ثقة التقييم: {r.confidence || "—"}</span>
            <span className="pill">{c.platform}</span>
            {c.source === "رصد آلي" && <span className="pill gold">رصد آلي</span>}
          </div>
          <p style={{ margin: "8px 0 0" }}>{r.summary}</p>
        </div>
      </div>

      {links.length > 0 && (
        <div className="linkwarn">
          <b>⚠️ مرتبط بـ {toAr(links.length)} {links.length === 1 ? "حالة سابقة" : "حالات سابقة"} في السجل</b>
          <div className="note" style={{ color: "#ffcfd0" }}>عبر: {[...new Set(links.flatMap(l => l.shared))].map((k, i) => <span key={i}>{k.split("|")[0]} <code>{k.split("|")[1]}</code> </span>)}</div>
        </div>
      )}

      {p.advertised && p.market_estimate && (
        <div className="box" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <b>💰 تحليل السعر</b>
            {gap > 0 && <span className={`pill ${gap >= 50 ? "red" : gap >= 25 ? "amber" : "green"}`}>أقل من السوق بنحو {toAr(gap)}٪</span>}
          </div>
          <div className="grid2" style={{ marginTop: 8 }}>
            <div><div className="note">السعر المعلن</div><b style={{ fontSize: 17 }}>{p.advertised}</b></div>
            <div><div className="note">السعر المعتاد في السوق</div><b style={{ fontSize: 17 }}>{p.market_estimate}</b></div>
          </div>
          {gap > 0 && <div style={{ height: 8, background: "#24304d", borderRadius: 99, marginTop: 10, overflow: "hidden" }}><div style={{ height: "100%", width: `${100 - gap}%`, background: gap >= 50 ? "var(--red)" : "var(--amber)" }} /></div>}
          {p.note && <div className="note" style={{ marginTop: 6 }}>{p.note}</div>}
        </div>
      )}
      {(r.tactics || []).length > 0 && <div style={{ marginTop: 12 }}><span className="note">أساليب النصب المرصودة:</span> {r.tactics.map((t, i) => <span key={i} className="pill red">{t}</span>)}</div>}

      {(r.account_analysis || r.image_analysis) && (
        <div className="grid2">
          {r.account_analysis && <div><h3>👤 تحليل الحساب</h3><div className="box">{r.account_analysis}</div></div>}
          {r.image_analysis && <div><h3>🖼️ تحليل الصورة</h3><div className="box">{r.image_analysis}</div></div>}
        </div>
      )}

      {lc.length > 0 && (<>
        <h3>🔗 فحص الروابط</h3>
        <ul className="flags">{lc.map((l, i) => {
          const lv = l.flags.find(f => f.level === "red") ? "red" : l.flags.find(f => f.level === "amber") ? "amber" : l.flags.find(f => f.level === "green") ? "green" : "none";
          return <li key={i} style={{ borderInlineStartColor: LC[lv] }}><b style={{ direction: "ltr", textAlign: "right" }}>{l.domain}</b>{l.flags.map((f, j) => <span key={j}>• {f.t}</span>)}</li>;
        })}</ul>
      </>)}

      <div className="grid2">
        <div>
          <h3>مؤشرات الخطورة</h3>
          {(r.red_flags || []).length ? <ul className="flags">{r.red_flags.map((f, i) => <li key={i}><b>{f.title}</b><span>{f.detail}</span></li>)}</ul> : <span className="note">لا توجد مؤشرات خطورة واضحة.</span>}
          {(r.positive_signals || []).length > 0 && (<><h3>مؤشرات أمان</h3><ul className="flags">{r.positive_signals.map((f, i) => <li key={i} style={{ borderInlineStartColor: "var(--green)" }}><span>{f}</span></li>)}</ul></>)}
        </div>
        <div>
          <h3>الكيانات المستخرجة</h3>
          <div className="box">{ents.length ? ents.map(([k, l]) => <div key={k}><span className="note">{l}:</span> {r.entities[k].map((x, i) => <code key={i}>{x}</code>)}</div>) : <span className="note">لم تُستخرج كيانات.</span>}</div>
          <h3>الإجراء المقترح للضابط</h3><div className="box">{r.officer_action}</div>
          <h3>نصيحة للجمهور</h3><div className="box">{r.citizen_advice}</div>
        </div>
      </div>

      <Deep d={c.deep} busy={deepBusy} />

      <div className="evid">Case ID: {c.id} · {fmtDate(c.createdAt)} · SHA-256: {c.hash || "—"}</div>
      <div className="row">
        {canDeep && <button className="btn sm" onClick={onDeep}>{c.deep?.status === "done" ? "إعادة الفحص المعمّق" : "🔎 فحص معمّق"}</button>}
        {onCopy && <button className="btn ghost sm" onClick={onCopy}>نسخ تقرير الحالة</button>}
        {extra}
      </div>
    </div>
  );
}
