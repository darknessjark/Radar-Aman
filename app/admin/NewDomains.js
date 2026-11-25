"use client";
import { useEffect, useState } from "react";
import { useLang } from "../components/Lang";
import { LinkCard } from "../components/LinkIntel";
import { runLinks } from "./Batch";

export default function NewDomains({ pw, show, canWrite }) {
  const { t } = useLang();
  const [days, setDays] = useState(null);
  const [watch, setWatch] = useState({});
  const [feeds, setFeeds] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState({});
  const [lvl, setLvl] = useState("high");
  const load = () => fetch("/api/admin/nrd", { headers: { "x-admin-password": pw } }).then(r => r.json()).then(j => { setDays(j.days || []); setWatch(j.watch || {}); setFeeds(j.feeds || null); }).catch(() => setDays([]));
  useEffect(() => { load(); }, [pw]);
  async function scanNow() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/nrd", { method: "POST", headers: { "x-admin-password": pw } });
      const j = await r.json();
      if (!r.ok) show(j.error || t("eLoad")); else { setDays(j.days || []); setWatch(j.watch || {}); setFeeds(j.feeds || null); if (j.run?.watch?.wentLive?.length) show(t("nrdWentLive", { n: j.run.watch.wentLive.length })); }
    } finally { setBusy(false); }
  }
  async function check(d) {
    setChecks(c => ({ ...c, [d]: "busy" }));
    try { const [row] = await runLinks([d], pw); setChecks(c => ({ ...c, [d]: row })); }
    catch (e) { show(e.message); setChecks(c => ({ ...c, [d]: null })); }
  }
  return (<>
    <p className="note" style={{ marginTop: 0 }}>{t("nrdIntro")}</p>
    <div className="row" style={{ marginTop: 0, marginBottom: 12 }}>
      {canWrite && <button className="btn sm" onClick={scanNow} disabled={busy}>{busy ? <><span className="spin" />{t("nrdScanning")}</> : t("nrdScan")}</button>}
      <select value={lvl} onChange={e => setLvl(e.target.value)} aria-label="level"><option value="high">{t("nrdHigh")}</option><option value="all">{t("nrdAll")}</option></select>
    </div>
    {feeds && <p className="note">{t("nrdFeeds", { u: feeds.urls, h: feeds.hosts, d: String(feeds.refreshedAt || "").slice(0, 16).replace("T", " ") })}</p>}
    {days === null && <p className="note"><span className="spin" /></p>}
    {days?.length === 0 && <div className="empty">{t("nrdNone")}</div>}
    {(days || []).map(dy => {
      const hits = dy.hits.filter(h => lvl === "all" || h.level === "high");
      return (
        <div className="net" key={dy.date}>
          <h4>{dy.date} <span className="pill">{t("nrdCount", { n: dy.total.toLocaleString("en"), h: dy.hits.length })}</span></h4>
          {!hits.length && <p className="note" style={{ margin: 0 }}>{t("nrdDayNone")}</p>}
          {hits.map(h => (
            <div className="member" key={h.domain}>
              <span className={`pill ${h.level === "high" ? "red" : "amber"}`}>{h.brand}</span> <b className="ltr">{h.domain}</b>{" "}
              {watch[h.domain] && <span className={`pill ${watch[h.domain].status === "live" ? "red" : ""}`}>{t("nw_" + watch[h.domain].status)}{watch[h.domain].caseId ? " · " : ""}{watch[h.domain].caseId && <a href={`/admin/evidence?id=${watch[h.domain].caseId}`} target="_blank" rel="noopener">{t("evFile")}</a>}</span>}{" "}
              {checks[h.domain] === undefined || checks[h.domain] === null ? <button className="btn ghost sm" onClick={() => check(h.domain)}>{t("nrdCheck")}</button> : checks[h.domain] === "busy" ? <span className="spin" /> : null}
              {checks[h.domain] && checks[h.domain] !== "busy" && <ul className="flags" style={{ marginTop: 6 }}><LinkCard l={checks[h.domain]} /></ul>}
            </div>
          ))}
        </div>
      );
    })}
  </>);
}
