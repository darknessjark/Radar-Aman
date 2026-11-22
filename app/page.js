"use client";
import { useState, useRef } from "react";
import TopBar from "./components/TopBar";
import ResultView from "./components/ResultView";
import useCopy from "./components/useCopy";
import { useLang } from "./components/Lang";
import { prepareImage } from "@/lib/clientImage";
import { reportText } from "@/lib/report";
import { PLATFORMS, platId } from "@/lib/i18n";

const MSG = ["whatsapp", "sms"], WEB = ["web", "gads"];
const modeOf = p => (MSG.includes(platId(p)) ? "msg" : WEB.includes(platId(p)) ? "web" : "social");

export default function Home() {
  const { t, lang } = useLang();
  const [platform, setPlatform] = useState(PLATFORMS[0][0]);
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
    let cur = [...imgs];
    for (const f of [...files]) {
      if (cur.length >= 3) { show(t("eMax")); break; }
      if (f.type && !f.type.startsWith("image/")) { show(t("eNotImg")); continue; }
      try { cur.push(await prepareImage(f)); } catch { show(t("eRead")); }
    }
    setImgs(cur);
  }

  async function scan() {
    setErr("");
    if (mode === "msg" && !text.trim() && !imgs.length) return setErr(t("eMsg"));
    if (mode === "web" && !url.trim() && !imgs.length && !text.trim()) return setErr(t("eWeb"));
    if (mode === "social" && !imgs.length && !url.trim() && !text.trim()) return setErr(t("eSocial"));
    setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang, platform, sourceUrl: url.trim(), text: text.trim(), images: imgs.map(i => i.full), thumbs: imgs.map(i => i.thumb), phash: imgs.map(i => i.hash) }) });
      const j = await r.json().catch(() => ({ error: t("eConn") }));
      if (!r.ok) throw new Error((j.error || t("eGeneric")) + (j.code ? " [" + j.code + "]" : ""));
      setRes(j);
      setTimeout(() => resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function deep() {
    if (!res) return;
    setDeepBusy(true); setErr("");
    try {
      const r = await fetch("/api/deep", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: res.case.id }) });
      const j = await r.json().catch(() => ({ error: t("eDeepConn") }));
      if (!r.ok) throw new Error(j.error || t("eDeep"));
      setRes({ ...res, case: j.case });
    } catch (e) {
      setErr(e.message);
      try { const r = await fetch("/api/case?id=" + res.case.id); if (r.ok) setRes(await r.json()); } catch {}
    } finally { setDeepBusy(false); }
  }

  function reset() { setUrl(""); setText(""); setImgs([]); setRes(null); setErr(""); setShowText(false); }

  const textBox = (mode === "msg" || showText || text) && (
    <div className="field">
      <label htmlFor="txt">{mode === "msg" ? t("msgText") : t("extraText")}</label>
      <textarea id="txt" dir="auto" value={text} onChange={e => setText(e.target.value)} placeholder={mode === "msg" ? t("msgPh") : t("extraPh")} />
    </div>
  );
  const shots = mode === "msg" ? t("shotsMsg") : mode === "web" ? t("shotsWeb") : t("shotsSocial");

  return (
    <>
      <TopBar><a href="/admin" className="toplink">{t("officer")}</a></TopBar>
      <main className="wrap">
        <section className="hero">
          <svg className="rings" viewBox="0 0 400 400" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1"><circle cx="200" cy="200" r="60" /><circle cx="200" cy="200" r="110" /><circle cx="200" cy="200" r="160" /><circle cx="200" cy="200" r="196" /><path d="M200 200 L330 70" /></g></svg>
          <div className="hero-copy">
            <h1>{t("heroTitle")}</h1>
            <p className="lead">{t("heroSub")}</p>
            <dl className="checks">
              {["Account", "Price", "Links", "Repeat"].map(k => <div key={k}><dt>{t("chk" + k)}</dt><dd>{t("chk" + k + "D")}</dd></div>)}
            </dl>
          </div>

          <div className="form sheet">
            <div className="grid2">
              <div className="field">
                <label htmlFor="plat">{t("platform")}</label>
                <select id="plat" value={platform} onChange={e => setPlatform(e.target.value)}>{PLATFORMS.map(([v, id]) => <option key={v} value={v}>{t("p_" + id)}</option>)}</select>
              </div>
              <div className="field">
                <label htmlFor="url">{mode === "msg" ? t("urlMsg") : mode === "web" ? t("urlWeb") : t("urlSocial")}</label>
                <input id="url" type="text" className="ltr" inputMode="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" />
              </div>
            </div>

            {mode === "msg" && textBox}

            <div className="field">
              <label>{shots}</label>
              <div className={"drop" + (over ? " over" : "") + (imgs.length ? " has" : "")}
                onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                onDrop={e => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>
                <span>{imgs.length ? t("dropCount", { n: t.n(imgs.length) }) : t("dropIdle")}</span>
                <input type="file" accept="image/*" multiple aria-label={shots} onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
              </div>
              {imgs.length > 0 && <div className="thumbs">{imgs.map((im, i) => <div className="t" key={i}><img src={im.thumb} alt="" /><button type="button" aria-label="remove" onClick={() => setImgs(imgs.filter((_, j) => j !== i))}>×</button></div>)}</div>}
              {mode === "social" && <p className="note" style={{ margin: "8px 0 0" }}>{t("tipSocial")}</p>}
            </div>

            {mode !== "msg" && textBox}
            {mode !== "msg" && !showText && !text && <button type="button" className="linkbtn" onClick={() => setShowText(true)}>+ {t("addText")}</button>}

            <div className="row">
              <button className="btn" onClick={scan} disabled={busy}>{busy ? <><span className="spin" />{t("scanning")}</> : t("scan")}</button>
              <button className="btn ghost" onClick={reset} disabled={busy}>{t("clear")}</button>
            </div>
            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </section>

        <div ref={resRef} className="result-wrap">
          {res && <ResultView c={res.case} links={res.links} onDeep={deep} deepBusy={deepBusy}
            onCopy={() => copy(reportText(res.case, res.links, lang))} onCopyText={copy} />}
        </div>

      </main>
      {ui}
    </>
  );
}
