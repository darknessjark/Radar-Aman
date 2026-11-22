"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../components/Lang";
import { renderPostImage } from "@/lib/postImage";
import { fmtDate } from "@/lib/report";

const finalScore = c => (c.deep?.status === "done" && typeof c.deep.score_after === "number" ? c.deep.score_after : c.result?.risk_score ?? 0);

function PostCard({ c, pw, ig, onCase, show, auto }) {
  const { t } = useLang();
  const p = c.post;
  const [img, setImg] = useState("");
  const [cap, setCap] = useState(p?.caption || "");
  const [head, setHead] = useState(p?.headline || "");
  const [pts, setPts] = useState(p?.points || []);
  const [busy, setBusy] = useState("");
  const call = async body => {
    const r = await fetch("/api/admin/post", { method: "POST", headers: { "content-type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ id: c.id, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || t("eUpd"));
    onCase(j.case); return j;
  };
  const draft = async () => { setBusy("draft"); try { const j = await call({ action: "draft" }); setCap(j.case.post.caption); setHead(j.case.post.headline); setPts(j.case.post.points); } catch (e) { show(e.message); } finally { setBusy(""); } };
  useEffect(() => { if (!p && auto) draft(); }, []);
  useEffect(() => { if (p) { setCap(p.caption); setHead(p.headline); setPts(p.points || []); } }, [p?.createdAt]);
  useEffect(() => { if (!head) return; const id = setTimeout(async () => setImg(await renderPostImage({ headline: head, points: pts, scamType: p?.scamType })), 250); return () => clearTimeout(id); }, [head, pts.join("|"), p?.scamType]);

  const approve = async () => {
    setBusy("approve");
    try {
      await call({ action: "save", caption: cap, headline: head, points: pts });
      const image = await renderPostImage({ headline: head, points: pts, scamType: p?.scamType });
      const j = await call({ action: "approve", caption: cap, image });
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
          <div className="field"><label>{t("pHead")}</label><input type="text" value={head} disabled={done} onChange={e => setHead(e.target.value)} /></div>
          <div className="field"><label>{t("pPoints")}</label>{[0, 1, 2].map(i => <input key={i} type="text" style={{ marginBottom: 6 }} value={pts[i] || ""} disabled={done} onChange={e => setPts(a => { const b = [...a]; b[i] = e.target.value; return b; })} />)}</div>
          <div className="field"><label>{t("pCaption")}</label><textarea dir="auto" value={cap} disabled={done} onChange={e => setCap(e.target.value)} style={{ minHeight: 160 }} /></div>
          <p className="note" style={{ margin: 0 }}>{t("pRule")}</p>
          {st === "published" && p.permalink && <p><a href={p.permalink} target="_blank" rel="noopener noreferrer">{t("pOpen")}</a></p>}
          <div className="row">
            {!done && <button className="btn" onClick={approve} disabled={!!busy}>{busy === "approve" ? <><span className="spin" />{t("pPublishing")}</> : ig ? t("pApprove") : t("pApproveLocal")}</button>}
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
  const [info, setInfo] = useState({ igConnected: false, min: 80 });
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
