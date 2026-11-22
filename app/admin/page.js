"use client";
import { useEffect, useMemo, useState } from "react";
import Logo from "../components/Logo";
import ResultView from "../components/ResultView";
import useCopy from "../components/useCopy";
import { networks, linkedTo } from "@/lib/networks";
import { reportText, riskColor, riskCls, toAr, fmtDate } from "@/lib/report";

const STATUSES = ["جديد", "قيد المراجعة", "تم طلب الحذف من المنصة", "محوّل للتحقيق", "آمن — لا إجراء"];
const scoreOf = c => (c.deep?.status === "done" ? c.deep.score_after : c.result?.risk_score ?? 0);

export default function Admin() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("cases");
  const [fRisk, setFRisk] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fPlat, setFPlat] = useState("all");
  const [open, setOpen] = useState(null);
  const [deepId, setDeepId] = useState(null);
  const [armed, setArmed] = useState(null);
  const { copy, show, ui } = useCopy();

  useEffect(() => { try { const s = sessionStorage.getItem("radar-pw"); if (s) { setPw(s); load(s); } } catch {} }, []);

  async function load(p = pw) {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/admin/cases", { headers: { "x-admin-password": p } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "تعذر التحميل");
      setCases(j.cases); setAuthed(true);
      try { sessionStorage.setItem("radar-pw", p); } catch {}
    } catch (e) { setErr(e.message); setAuthed(false); } finally { setLoading(false); }
  }
  async function update(id, body) {
    const r = await fetch("/api/admin/update", { method: "POST", headers: { "content-type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ id, ...body }) });
    const j = await r.json();
    if (!r.ok) return show(j.error || "تعذر التحديث");
    if (body.remove) { setCases(cs => cs.filter(c => c.id !== id)); setOpen(null); show("تم الحذف"); }
    else setCases(cs => cs.map(c => (c.id === id ? j.case : c)));
  }
  async function deep(id) {
    setDeepId(id);
    try {
      const r = await fetch("/api/deep", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) show(j.error || "تعذر الفحص المعمّق");
      else setCases(cs => cs.map(c => (c.id === id ? j.case : c)));
    } finally { setDeepId(null); }
  }

  const nets = useMemo(() => networks(cases), [cases]);
  const list = useMemo(() => cases.filter(c => {
    const v = scoreOf(c);
    if (fRisk === "high" && v < 70) return false;
    if (fRisk === "mid" && (v < 40 || v >= 70)) return false;
    if (fRisk === "low" && v >= 40) return false;
    if (fStatus !== "all" && c.status !== fStatus) return false;
    if (fPlat !== "all" && c.platform !== fPlat) return false;
    return true;
  }).sort((a, b) => scoreOf(b) - scoreOf(a) || (b.createdAt > a.createdAt ? 1 : -1)), [cases, fRisk, fStatus, fPlat]);
  const platforms = [...new Set(cases.map(c => c.platform))];
  const openCase = cases.find(c => c.id === open);

  if (!authed) return (
    <div className="wrap" style={{ maxWidth: 420 }}>
      <header><Logo /><div><h1>لوحة الضابط</h1><div className="sub">رادار أمان</div></div></header>
      <div className="card">
        <label>كلمة السر</label>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} />
        <div className="row"><button className="btn" onClick={() => load()} disabled={loading || !pw}>{loading ? "جاري الدخول..." : "دخول"}</button><a href="/" className="note">العودة لصفحة الفحص</a></div>
        {err && <div className="err">{err}</div>}
      </div>
    </div>
  );

  return (
    <div className="wrap">
      <header>
        <Logo />
        <div><h1>لوحة الضابط — رادار أمان</h1><div className="sub">كل الحالات المفحوصة مرتبة حسب الخطورة</div></div>
        <button className="btn ghost sm" style={{ marginInlineStart: "auto" }} onClick={() => load()} disabled={loading}>{loading ? "..." : "↻ تحديث"}</button>
      </header>

      <div className="stats">
        <div className="stat"><b>{toAr(cases.length)}</b><span>إعلانات تم فحصها</span></div>
        <div className="stat"><b style={{ color: "var(--red)" }}>{toAr(cases.filter(c => scoreOf(c) >= 70).length)}</b><span>عالية الخطورة</span></div>
        <div className="stat"><b style={{ color: "var(--accent2)" }}>{toAr(nets.length)}</b><span>شبكات مرتبطة</span></div>
        <div className="stat"><b style={{ color: "var(--amber)" }}>{toAr(cases.filter(c => ["جديد", "قيد المراجعة"].includes(c.status) && scoreOf(c) >= 40).length)}</b><span>بانتظار إجراء</span></div>
      </div>

      <div className="tabs">
        <button className={"tab" + (tab === "cases" ? " on" : "")} onClick={() => setTab("cases")}>الحالات</button>
        <button className={"tab" + (tab === "nets" ? " on" : "")} onClick={() => setTab("nets")}>الشبكات المرتبطة</button>
      </div>

      {tab === "cases" && (<>
        <div className="filters">
          <select value={fRisk} onChange={e => setFRisk(e.target.value)}><option value="all">كل مستويات الخطورة</option><option value="high">عالية (٧٠+)</option><option value="mid">متوسطة (٤٠–٦٩)</option><option value="low">منخفضة</option></select>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)}><option value="all">كل الحالات</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          <select value={fPlat} onChange={e => setFPlat(e.target.value)}><option value="all">كل المنصات</option>{platforms.map(p => <option key={p}>{p}</option>)}</select>
        </div>
        {!list.length && <div className="empty">{cases.length ? "لا توجد حالات بهذه التصفية." : "لا توجد حالات بعد."}</div>}
        {list.map(c => {
          const r = c.result || {}, v = scoreOf(c), col = riskColor(v), ln = linkedTo(c, cases).length;
          return (
            <div className="case" key={c.id}>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="score" style={{ background: col + "22", color: col, border: `1px solid ${col}` }}>{toAr(v)}</div>
                {c.thumbs?.[0] && <img src={c.thumbs[0]} alt="" />}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{r.scam_type && r.scam_type !== "لا يوجد" ? r.scam_type : r.verdict}</div>
                <div className="meta">{c.platform} · {fmtDate(c.createdAt)}{c.source === "رصد آلي" ? " · رصد آلي" : ""}
                  {ln > 0 && <span style={{ color: "#ffb3b5" }}> · مرتبط بـ {toAr(ln)}</span>}
                  {c.deep?.status === "done" && <span style={{ color: "var(--accent2)" }}> · 🔎 فُحص بعمق</span>}
                  {(c.deep?.status === "running" || deepId === c.id) && <span style={{ color: "#9cc2ff" }}> · 🔎 جاري الفحص المعمّق</span>}
                </div>
                <div style={{ fontSize: 13.5, marginTop: 4 }}>{c.deep?.status === "done" ? c.deep.summary : r.summary}</div>
              </div>
              <div className="acts">
                <select value={c.status} onChange={e => update(c.id, { status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
                <button className="btn ghost sm" onClick={() => setOpen(c.id)}>عرض التفاصيل</button>
                <button className="btn ghost sm" onClick={() => copy(reportText(c, linkedTo(c, cases).map(l => ({ id: l.o.id }))))}>نسخ التقرير</button>
                <button className="btn ghost sm" style={{ color: "#ff9b9e" }} onClick={() => { if (armed === c.id) { update(c.id, { remove: true }); setArmed(null); } else { setArmed(c.id); setTimeout(() => setArmed(a => (a === c.id ? null : a)), 3000); } }}>{armed === c.id ? "تأكيد الحذف" : "حذف"}</button>
              </div>
            </div>
          );
        })}
      </>)}

      {tab === "nets" && (<>
        <p className="note" style={{ marginTop: 0 }}>يربط النظام تلقائيًا الإعلانات التي تشترك في رقم هاتف أو حساب بنكي أو موقع أو حساب تواصل أو صورة مكررة — مؤشر على أن جهة واحدة تقف خلفها.</p>
        {!nets.length && <div className="empty">لم تُكتشف شبكات بعد.</div>}
        {nets.map((n, i) => {
          const max = Math.max(...n.members.map(scoreOf));
          return (
            <div className="net" key={i}>
              <h4>شبكة #{toAr(i + 1)} — {toAr(n.members.length)} إعلانات <span className={`pill ${riskCls(max)}`}>أعلى خطورة {toAr(max)}</span></h4>
              <div className="note" style={{ marginBottom: 6 }}>القاسم المشترك: {n.shared.map((k, j) => <span key={j}>{k.split("|")[0]} <code>{k.split("|")[1]}</code> </span>)}</div>
              {n.members.map(m => <div className="member" key={m.id}><a href="#" onClick={e => { e.preventDefault(); setOpen(m.id); }}>{toAr(scoreOf(m))} · {m.platform} · {m.result?.scam_type}</a> <span className="note">— {fmtDate(m.createdAt)}</span></div>)}
            </div>
          );
        })}
      </>)}

      {openCase && (
        <div className="modal" onClick={e => e.target === e.currentTarget && setOpen(null)}>
          <ResultView c={openCase} links={linkedTo(openCase, cases).map(l => ({ id: l.o.id, shared: l.shared }))}
            onDeep={() => deep(openCase.id)} deepBusy={deepId === openCase.id}
            onCopy={() => copy(reportText(openCase, linkedTo(openCase, cases).map(l => ({ id: l.o.id }))))}
            extra={<button className="btn ghost sm" onClick={() => setOpen(null)}>إغلاق</button>} />
        </div>
      )}
      {ui}
    </div>
  );
}
