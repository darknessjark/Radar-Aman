"use client";
import { useEffect, useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import ResultView from "../components/ResultView";
import useCopy from "../components/useCopy";
import { useLang } from "../components/Lang";
import { networks, linkedTo } from "@/lib/networks";
import { reportText, riskColor, riskCls, verdictKey, fmtDate } from "@/lib/report";
import Posts from "./Posts";
import Library from "./Library";
import { STATUSES, statusKey, PLATFORMS, platId, KEY_KIND } from "@/lib/i18n";

const scoreOf = c => (c.deep?.status === "done" ? c.deep.score_after : c.result?.risk_score ?? 0);

export default function Admin() {
  const { t, lang } = useLang();
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
      if (!r.ok) throw new Error(j.error || t("eLoad"));
      setCases(j.cases); setAuthed(true);
      try { sessionStorage.setItem("radar-pw", p); } catch {}
    } catch (e) { setErr(e.message); setAuthed(false); } finally { setLoading(false); }
  }
  async function update(id, body) {
    const r = await fetch("/api/admin/update", { method: "POST", headers: { "content-type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ id, ...body }) });
    const j = await r.json();
    if (!r.ok) return show(j.error || t("eUpd"));
    if (body.remove) { setCases(cs => cs.filter(c => c.id !== id)); setOpen(null); show(t("deleted")); }
    else setCases(cs => cs.map(c => (c.id === id ? j.case : c)));
  }
  async function deep(id) {
    setDeepId(id);
    try {
      const r = await fetch("/api/deep", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) show(j.error || t("eDeep"));
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
  const keyLabel = k => { const [kind, v] = k.split("|"); return <span key={k}>{t(KEY_KIND[kind] || "k_site")} <code>{kind === "صورة" ? t("k_imgdup") : v}</code> </span>; };
  const rep = (c) => reportText(c, linkedTo(c, cases).map(l => ({ id: l.o.id })), lang);

  if (!authed) return (
    <>
      <TopBar />
      <main className="wrap narrow">
        <h1 className="h-page">{t("officer")}</h1>
        <div className="sheet">
          <div className="field"><label htmlFor="pw">{t("pw")}</label>
            <input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} /></div>
          <div className="row"><button className="btn" onClick={() => load()} disabled={loading || !pw}>{loading ? t("entering") : t("enter")}</button><a href="/" className="note">{t("back")}</a></div>
          {err && <div className="err" role="alert">{err}</div>}
        </div>
      </main>
    </>
  );

  return (
    <>
      <TopBar><button className="btn ghost sm" onClick={() => load()} disabled={loading}>{t("refresh")}</button></TopBar>
      <main className="wrap">
        <div className="page-head"><h1 className="h-page">{t("officer")}</h1><p className="note">{t("dashSub")}</p></div>

        <div className="stats">
          <div className="stat"><b>{t.n(cases.length)}</b><span>{t("stChecked")}</span></div>
          <div className="stat"><b style={{ color: "var(--red)" }}>{t.n(cases.filter(c => scoreOf(c) >= 70).length)}</b><span>{t("stHigh")}</span></div>
          <div className="stat"><b style={{ color: "var(--teal)" }}>{t.n(nets.length)}</b><span>{t("stNets")}</span></div>
          <div className="stat"><b style={{ color: "var(--amber)" }}>{t.n(cases.filter(c => ["جديد", "قيد المراجعة"].includes(c.status) && scoreOf(c) >= 40).length)}</b><span>{t("stPending")}</span></div>
        </div>

        <div className="tabs" role="tablist">
          <button role="tab" className={"tab" + (tab === "cases" ? " on" : "")} onClick={() => setTab("cases")}>{t("tabCases")}</button>
          <button role="tab" className={"tab" + (tab === "nets" ? " on" : "")} onClick={() => setTab("nets")}>{t("tabNets")}</button>
          <button role="tab" className={"tab" + (tab === "posts" ? " on" : "")} onClick={() => setTab("posts")}>{t("tabPosts")}</button>
          <button role="tab" className={"tab" + (tab === "lib" ? " on" : "")} onClick={() => setTab("lib")}>{t("tabLib")}</button>
        </div>

        {tab === "cases" && (<>
          <div className="filters">
            <select aria-label={t("flagsT")} value={fRisk} onChange={e => setFRisk(e.target.value)}><option value="all">{t("fAllRisk")}</option><option value="high">{t("fHigh")}</option><option value="mid">{t("fMid")}</option><option value="low">{t("fLow")}</option></select>
            <select aria-label="status" value={fStatus} onChange={e => setFStatus(e.target.value)}><option value="all">{t("fAllStatus")}</option>{STATUSES.map(s => <option key={s} value={s}>{t(statusKey(s))}</option>)}</select>
            <select aria-label={t("platform")} value={fPlat} onChange={e => setFPlat(e.target.value)}><option value="all">{t("fAllPlat")}</option>{platforms.map(p => <option key={p} value={p}>{t("p_" + platId(p))}</option>)}</select>
          </div>
          {!list.length && <div className="empty">{cases.length ? t("noMatch") : t("noCases")}</div>}
          {list.map(c => {
            const r = c.result || {}, v = scoreOf(c), col = riskColor(v), ln = linkedTo(c, cases).length;
            return (
              <div className="case" key={c.id}>
                <div className="score" style={{ borderColor: col, color: col }}>{t.n(v)}</div>
                {c.thumbs?.[0] && <img src={c.thumbs[0]} alt="" />}
                <div className="case-main">
                  <div className="case-title">{r.scam_type && r.scam_type !== "لا يوجد" ? r.scam_type : t(verdictKey(v))}</div>
                  <div className="meta">{t("p_" + platId(c.platform))} · <span className="ltr">{fmtDate(c.createdAt)}</span>{c.source === "رصد آلي" ? ` · ${t("auto")}` : ""}
                    {ln > 0 && <span className="m-red"> · {t("linkedN", { n: t.n(ln) })}</span>}
                    {c.userReports > 0 && <span className="m-red"> · {t("userReports", { n: t.n(c.userReports) })}</span>}
                    {c.deep?.status === "done" && <span className="m-teal"> · {t("deepDone")}</span>}
                    {(c.deep?.status === "running" || deepId === c.id) && <span className="m-teal"> · {t("deepRunning")}</span>}
                  </div>
                  <div className="case-sum" dir="auto">{c.deep?.status === "done" ? c.deep.summary : r.summary}</div>
                </div>
                <div className="acts">
                  <select aria-label="status" value={c.status} onChange={e => update(c.id, { status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{t(statusKey(s))}</option>)}</select>
                  <button className="btn ghost sm" onClick={() => setOpen(c.id)}>{t("details")}</button>
                  <button className="btn ghost sm" onClick={() => copy(rep(c))}>{t("copy")}</button>
                  <button className="btn ghost sm danger" onClick={() => { if (armed === c.id) { update(c.id, { remove: true }); setArmed(null); } else { setArmed(c.id); setTimeout(() => setArmed(a => (a === c.id ? null : a)), 3000); } }}>{armed === c.id ? t("delConfirm") : t("del")}</button>
                </div>
              </div>
            );
          })}
        </>)}

        {tab === "nets" && (<>
          <p className="note" style={{ marginTop: 0 }}>{t("netsNote")}</p>
          {!nets.length && <div className="empty">{t("noNets")}</div>}
          {nets.map((n, i) => {
            const max = Math.max(...n.members.map(scoreOf));
            return (
              <div className="net" key={i}>
                <h4>{t("netN", { i: t.n(i + 1), n: t.n(n.members.length) })} <span className={`pill ${riskCls(max)}`}>{t("maxRisk", { n: t.n(max) })}</span></h4>
                <div className="note" style={{ marginBottom: 6 }}>{t("common")}: {n.shared.map(keyLabel)}</div>
                {n.members.map(m => <div className="member" key={m.id}><a href="#" onClick={e => { e.preventDefault(); setOpen(m.id); }}>{t.n(scoreOf(m))} · {t("p_" + platId(m.platform))} · {m.result?.scam_type}</a> <span className="note ltr">{fmtDate(m.createdAt)}</span></div>)}
              </div>
            );
          })}
        </>)}
        {tab === "posts" && <Posts cases={cases} pw={pw} show={show} onCase={nc => setCases(cs => cs.map(c => (c.id === nc.id ? nc : c)))} />}
        {tab === "lib" && <Library pw={pw} show={show} />}
      </main>

      {openCase && (
        <div className="modal" onClick={e => e.target === e.currentTarget && setOpen(null)}>
          <ResultView c={openCase} links={linkedTo(openCase, cases).map(l => ({ id: l.o.id, shared: l.shared }))}
            onDeep={() => deep(openCase.id)} deepBusy={deepId === openCase.id}
            onCopy={() => copy(rep(openCase))} onCopyText={copy}
            extra={<button className="btn ghost" onClick={() => setOpen(null)}>{t("close")}</button>} />
        </div>
      )}
      {ui}
    </>
  );
}
