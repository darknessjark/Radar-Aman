"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../components/Lang";
import { renderPostImage } from "@/lib/postImage";
import { fmtDate } from "@/lib/report";
import { prepareImage } from "@/lib/clientImage";

const finalScore = c => (c.deep?.status === "done" && typeof c.deep.score_after === "number" ? c.deep.score_after : c.result?.risk_score ?? 0);

function PostCard({ c, pw, ig, onCase, show, auto }) {
  const { t } = useLang();
  const p = c.post;
  const [img, setImg] = useState("");
  const [cap, setCap] = useState(p?.caption || "");
  const [head, setHead] = useState(p?.headline || "");
  const [pts, setPts] = useState(p?.points || []);
  const [busy, setBusy] = useState("");
  const [shot, setShot] = useState("");
  const [boxes, setBoxes] = useState(p?.boxes || []);
  const [mode, setMode] = useState(p?.mode || (c.hasImage ? "shot" : "text"));
  const [reviewed, setReviewed] = useState(false);
  const [drag, setDrag] = useState(null);
  const pad = useRef(null);
  const get = async url => { const r = await fetch(url, { headers: { "x-admin-password": pw } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || t("eUpd")); return j; };
  const call = async body => {
    const r = await fetch("/api/admin/post", { method: "POST", headers: { "content-type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ id: c.id, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || t("eUpd"));
    onCase(j.case); return j;
  };
  const draft = async () => { setBusy("draft"); try { const j = await call({ action: "draft" }); setCap(j.case.post.caption); setHead(j.case.post.headline); setPts(j.case.post.points); } catch (e) { show(e.message); } finally { setBusy(""); } };
  useEffect(() => { if (!p && auto) draft(); }, []);
  // load the saved screenshot of the case (if any) once the draft exists
  useEffect(() => { if (p && c.hasImage && !shot) get("/api/admin/post?img=" + c.id).then(j => setShot(j.image)).catch(() => {}); }, [!!p, c.hasImage]);
  const detect = async () => {
    setBusy("detect");
    try { const j = await call2({ action: "detect" }); setBoxes(j.boxes); await call({ action: "save", boxes: j.boxes, detected: true }); } catch (e) { show(e.message); } finally { setBusy(""); }
  };
  const call2 = async body => {
    const r = await fetch("/api/admin/post", { method: "POST", headers: { "content-type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ id: c.id, ...body }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || t("eUpd")); return j;
  };
  // first time a screenshot is available: find the private parts automatically
  useEffect(() => { if (shot && p && !p.detected && !busy) detect(); }, [!!shot, p?.createdAt]);
  useEffect(() => { setMode(p?.mode || (c.hasImage ? "shot" : "text")); setBoxes(p?.boxes || []); }, [p?.createdAt, c.hasImage]);
  const upload = async f => {
    if (!f) return;
    setBusy("upload");
    try {
      const im = await prepareImage(f);
      const j = await call({ action: "image", image: im.post });
      setShot(im.post); setBoxes([]); setMode("shot"); setReviewed(false);
      await call({ action: "save", mode: "shot", boxes: [], detected: false });
    } catch (e) { show(e.message); } finally { setBusy(""); }
  };
  const saveBoxes = async (b, extra = {}) => { setBoxes(b); setReviewed(false); try { await call({ action: "save", boxes: b, ...extra }); } catch (e) { show(e.message); } };
  const pt = e => { const r = pad.current.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }; };
  const down = e => { if (done) return; e.currentTarget.setPointerCapture?.(e.pointerId); const a = pt(e); setDrag({ a, b: a }); };
  const move = e => { if (drag) setDrag({ ...drag, b: pt(e) }); };
  const up = () => {
    if (!drag) return;
    const { a, b } = drag, x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y);
    setDrag(null);
    if (w < 0.015 && h < 0.015) {
      const i = [...boxes].map((bx, k) => ({ bx, k })).reverse().find(({ bx }) => a.x >= bx.x && a.x <= bx.x + bx.w && a.y >= bx.y && a.y <= bx.y + bx.h);
      if (i) saveBoxes(boxes.filter((_, k) => k !== i.k));
    } else saveBoxes([...boxes, { x, y, w, h }]);
  };
  const useShot = mode === "shot" && !!shot;
  useEffect(() => { if (p) { setCap(p.caption); setHead(p.headline); setPts(p.points || []); } }, [p?.createdAt]);
  const sig = JSON.stringify(boxes);
  useEffect(() => { if (!head) return; const id = setTimeout(async () => setImg(await renderPostImage({ headline: head, points: pts, scamType: p?.scamType, shot: useShot ? shot : "", boxes })), 250); return () => clearTimeout(id); }, [head, pts.join("|"), p?.scamType, useShot, shot, sig]);

  const approve = async () => {
    setBusy("approve");
    try {
      await call({ action: "save", caption: cap, headline: head, points: pts, boxes, mode: useShot ? "shot" : "text" });
      const image = await renderPostImage({ headline: head, points: pts, scamType: p?.scamType, shot: useShot ? shot : "", boxes });
      const j = await call({ action: "approve", caption: cap, image, reviewed: useShot ? reviewed : true });
      show(j.published ? t("pPublished") : t("pApprovedNoIg"));
    } catch (e) { show(e.message); } finally { setBusy(""); }
  };
  const reject = async () => { setBusy("reject"); try { await call({ action: "reject" }); } catch (e) { show(e.message); } finally { setBusy(""); } };
  const st = p?.status;
  const done = st === "published" || st === "rejected";

  return (
    <div className="post">
      <div className="post-img">{img ? <img src={img} alt="" /> : <div className="post-ph">{busy === "draft" ? <><span className="spin" />{t("pDrafting")}</> : t("pNoDraft")}</div>}</div>
      <div className="post-body">
        <div className="post-top">
          <span className="score-sm">{t.n(finalScore(c))}</span>
          <b>{c.result?.scam_type}</b>
          <span className={"pill " + (st === "published" ? "green" : st === "rejected" ? "" : st === "approved" ? "amber" : "red")}>{t("ps_" + (st || "none"))}</span>
        </div>
        <div className="meta"><span className="ltr">{fmtDate(c.createdAt)}</span></div>
        {!p && <div className="row"><button className="btn sm" onClick={draft} disabled={!!busy}>{t("pDraft")}</button></div>}
        {p && (<>
          <div className="field">
            <label>{t("pDesign")}</label>
            <div className="seg">
              <button type="button" className={useShot ? "on" : ""} disabled={done || !shot} onClick={() => { setMode("shot"); call({ action: "save", mode: "shot" }).catch(() => {}); }}>{t("pModeShot")}</button>
              <button type="button" className={!useShot ? "on" : ""} disabled={done} onClick={() => { setMode("text"); call({ action: "save", mode: "text" }).catch(() => {}); }}>{t("pModeText")}</button>
            </div>
            {!done && <label className="btn ghost sm filebtn">{busy === "upload" ? <><span className="spin" />{t("pUploading")}</> : shot ? t("pReplaceShot") : t("pUploadShot")}<input type="file" accept="image/*" hidden onChange={e => { upload(e.target.files?.[0]); e.target.value = ""; }} /></label>}
          </div>
          {useShot && (
            <div className="field">
              <label>{t("pCover")}</label>
              <p className="note" style={{ margin: "0 0 8px" }}>{busy === "detect" ? <><span className="spin" />{t("pDetecting")}</> : t("pCoverHelp")}</p>
              <div className="shot" ref={pad} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
                <img src={shot} alt="" draggable={false} />
                {boxes.map((b, i) => <span key={i} className="cover" style={{ left: b.x * 100 + "%", top: b.y * 100 + "%", width: b.w * 100 + "%", height: b.h * 100 + "%" }} />)}
                {drag && <span className="cover draft" style={{ left: Math.min(drag.a.x, drag.b.x) * 100 + "%", top: Math.min(drag.a.y, drag.b.y) * 100 + "%", width: Math.abs(drag.a.x - drag.b.x) * 100 + "%", height: Math.abs(drag.a.y - drag.b.y) * 100 + "%" }} />}
              </div>
              {!done && <div className="row" style={{ marginTop: 8 }}>
                <button type="button" className="btn ghost sm" onClick={detect} disabled={!!busy}>{t("pDetect")}</button>
                <button type="button" className="btn ghost sm" onClick={() => saveBoxes([])} disabled={!!busy || !boxes.length}>{t("pClearBoxes")}</button>
              </div>}
            </div>
          )}
          <div className="field"><label>{t("pHead")}</label><input type="text" value={head} disabled={done} onChange={e => setHead(e.target.value)} /></div>
          <div className="field"><label>{t("pPoints")}</label>{[0, 1, 2].map(i => <input key={i} type="text" style={{ marginBottom: 6 }} value={pts[i] || ""} disabled={done} onChange={e => setPts(a => { const b = [...a]; b[i] = e.target.value; return b; })} />)}</div>
          <div className="field"><label>{t("pCaption")}</label><textarea dir="auto" value={cap} disabled={done} onChange={e => setCap(e.target.value)} style={{ minHeight: 160 }} /></div>
          <p className="note" style={{ margin: 0 }}>{t("pRule")}</p>
          {st === "published" && p.permalink && <p><a href={p.permalink} target="_blank" rel="noopener noreferrer">{t("pOpen")}</a></p>}
          <div className="row">
            {!done && useShot && <label className="check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />{t("pReviewed")}</label>}
            {!done && <button className="btn" onClick={approve} disabled={!!busy || (useShot && !reviewed)}>{busy === "approve" ? <><span className="spin" />{t("pPublishing")}</> : ig ? t("pApprove") : t("pApproveLocal")}</button>}
            {!done && <button className="btn ghost" onClick={draft} disabled={!!busy}>{t("pRedraft")}</button>}
            {!done && <button className="btn ghost danger" onClick={reject} disabled={!!busy}>{t("pReject")}</button>}
            {img && <a className="btn ghost" href={img} download={`radar-aman-${c.id}.jpg`}>{t("pDownload")}</a>}
            {cap && <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(cap).then(() => show(t("copied")))}>{t("pCopyCap")}</button>}
          </div>
        </>)}
      </div>
    </div>
  );
}

export default function Posts({ cases, pw, onCase, show }) {
  const { t } = useLang();
  const [info, setInfo] = useState({ igConnected: false, min: 65 });
  const seen = useRef(0);
  useEffect(() => { fetch("/api/admin/post", { headers: { "x-admin-password": pw } }).then(r => r.json()).then(setInfo).catch(() => {}); }, [pw]);
  const list = cases.filter(c => finalScore(c) >= info.min).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  const order = ["draft", undefined, "approved", "published", "rejected"];
  list.sort((a, b) => order.indexOf(a.post?.status) - order.indexOf(b.post?.status));
  let autoLeft = 3;
  return (<>
    <div className={"igbar" + (info.igConnected ? " on" : "")}>{info.igConnected ? t("pIgOn") : t("pIgOff")}</div>
    <p className="note" style={{ marginTop: 0 }}>{t("pIntro", { n: t.n(info.min) })}</p>
    {!list.length && <div className="empty">{t("pEmpty", { n: t.n(info.min) })}</div>}
    {list.map(c => <PostCard key={c.id} c={c} pw={pw} ig={info.igConnected} onCase={onCase} show={show} auto={!c.post && autoLeft-- > 0} />)}
  </>);
}
