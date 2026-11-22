"use client";
import { useState, useRef } from "react";
import Logo from "./components/Logo";
import ResultView from "./components/ResultView";
import useCopy from "./components/useCopy";
import { prepareImage } from "@/lib/clientImage";
import { reportText, toAr } from "@/lib/report";

const PLATFORMS = ["تيك توك", "إنستقرام", "سناب شات", "فيسبوك", "واتساب", "رسالة نصية SMS", "موقع إلكتروني", "إعلان قوقل", "أخرى"];
const MSG = ["واتساب", "رسالة نصية SMS"], WEB = ["موقع إلكتروني", "إعلان قوقل"];
const modeOf = p => (MSG.includes(p) ? "msg" : WEB.includes(p) ? "web" : "social");

export default function Home() {
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [showText, setShowText] = useState(false);
  const [imgs, setImgs] = useState([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deepBusy, setDeepBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);
  const resRef = useRef(null);
  const { copy, show, ui } = useCopy();
  const mode = modeOf(platform);

  async function addFiles(files) {
    const list = [...files];
    let cur = [...imgs];
    for (const f of list) {
      if (cur.length >= 3) { show("الحد الأقصى ٣ صور"); break; }
      if (f.type && !f.type.startsWith("image/")) { show("الملف ليس صورة"); continue; }
      try { cur.push(await prepareImage(f)); } catch { show("تعذر قراءة الصورة — جرّب PNG أو JPG"); }
    }
    setImgs(cur);
  }

  async function scan() {
    setErr("");
    if (mode === "msg" && !text.trim() && !imgs.length) return setErr("الصق نص الرسالة أو ارفع لقطة شاشة لها.");
    if (mode === "web" && !url.trim() && !imgs.length && !text.trim()) return setErr("أدخل رابط الموقع.");
    if (mode === "social" && !imgs.length && !url.trim() && !text.trim()) return setErr("ارفع لقطة شاشة للإعلان.");
    setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform, sourceUrl: url.trim(), text: text.trim(), images: imgs.map(i => i.full), thumbs: imgs.map(i => i.thumb), phash: imgs.map(i => i.hash) }) });
      const j = await r.json().catch(() => ({ error: "رد غير متوقع من الخادم" }));
      if (!r.ok) throw new Error((j.error || "تعذر التحليل") + (j.code ? " [" + j.code + "]" : ""));
      setRes(j);
      setTimeout(() => resRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function deep() {
    if (!res) return;
    setDeepBusy(true); setErr("");
    try {
      const r = await fetch("/api/deep", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: res.case.id }) });
      const j = await r.json().catch(() => ({ error: "انقطع الاتصال أثناء الفحص المعمّق" }));
      if (!r.ok) throw new Error(j.error || "تعذر الفحص المعمّق");
      setRes({ ...res, case: j.case });
    } catch (e) {
      setErr(e.message);
      try { const r = await fetch("/api/case?id=" + res.case.id); if (r.ok) setRes(await r.json()); } catch {}
    } finally { setDeepBusy(false); }
  }

  function reset() { setUrl(""); setText(""); setImgs([]); setRes(null); setErr(""); setShowText(false); }

  const textBox = (mode === "msg" || showText || text) && (
    <div>
      <label>{mode === "msg" ? "نص الرسالة" : "نص إضافي (اختياري)"}</label>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder={mode === "msg" ? "الصق نص الرسالة كما وصلتك..." : "أي نص غير ظاهر في الصور..."} />
    </div>
  );

  return (
    <div className="wrap">
      <header>
        <Logo />
        <div><h1>رادار أمان</h1><div className="sub">افحص أي إعلان أو رسالة مشبوهة قبل ما تدفع — بالذكاء الاصطناعي</div></div>
        <span className="badge">نموذج أولي</span>
      </header>

      <div className="card">
        <div className="grid2">
          <div>
            <label>المنصة</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select>
          </div>
          <div>
            <label>{mode === "msg" ? "رابط موجود في الرسالة (اختياري)" : mode === "web" ? "رابط الموقع" : "رابط الإعلان أو الحساب (اختياري)"}</label>
            <input type="text" className="ltr" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        {mode === "msg" && textBox}

        <label>{mode === "msg" ? "لقطة شاشة للرسالة (اختياري)" : mode === "web" ? "لقطة شاشة للموقع (اختياري)" : "لقطات شاشة للإعلان وصفحة الحساب (حتى ٣ صور)"}</label>
        <div className={"drop" + (over ? " over" : "")}
          onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}>
          {imgs.length ? `✅ ${toAr(imgs.length)} صورة مرفقة — اضغط لإضافة المزيد` : "📷 اضغط هنا لاختيار الصور، أو اسحبها هنا"}
          <input type="file" accept="image/*" multiple aria-label="اختيار صور" onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
        </div>
        <div className="thumbs">{imgs.map((im, i) => <div className="t" key={i}><img src={im.thumb} alt="" /><button onClick={() => setImgs(imgs.filter((_, j) => j !== i))}>×</button></div>)}</div>
        {mode === "social" && <div className="note" style={{ marginTop: 6 }}>💡 ارفع لقطة الإعلان + لقطة صفحة الحساب (البايو) — الأداة تقرأ النص والأرقام من الصور.</div>}

        {mode !== "msg" && textBox}
        {mode !== "msg" && !showText && !text && <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setShowText(true)}>+ إضافة نص (اختياري)</button>}

        <div className="row">
          <button className="btn" onClick={scan} disabled={busy}>{busy ? <><span className="spin" />جاري التحليل...</> : "افحص الإعلان"}</button>
          <button className="btn ghost" onClick={reset} disabled={busy}>مسح</button>
        </div>
        {err && <div className="err">{err}</div>}
      </div>

      <div ref={resRef} style={{ marginTop: 16 }}>
        {res && <ResultView c={res.case} links={res.links} onDeep={deep} deepBusy={deepBusy} onCopy={() => copy(reportText(res.case, res.links))} />}
      </div>

      <footer>
        رادار أمان — نموذج أولي. النتائج استرشادية ولا تغني عن التحقق الرسمي. للإبلاغ عن احتيال: خدمة أمان 8002626 أو رسالة إلى 2828.
        <div style={{ marginTop: 6 }}><a href="/admin">لوحة الضابط</a></div>
      </footer>
      {ui}
    </div>
  );
}
