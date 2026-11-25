"use client";
import { useEffect, useState } from "react";
import { useLang } from "../../components/Lang";
import { LinkCard } from "../../components/LinkIntel";
import { download } from "../Batch";
import { riskCls } from "@/lib/report";

const dubai = s => { try { return new Date(s).toLocaleString("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "medium" }) + " (Dubai)"; } catch { return s; } };
const ENT = ["phones", "ibans", "domains", "urls", "accounts", "emails"];

// Ready-to-send takedown request for the registrar or hosting provider (opens the officer's mail app; nothing is sent automatically).
function takedown(b, e) {
  const l = e.intel || {}, s = e.screenshot || {};
  const reasons = (l.flags || []).filter(f => f.level === "red" || f.level === "amber").slice(0, 5).map(f => "- " + (f.e || f.t));
  const body = [
    "Hello,", "",
    "We are reporting a fraudulent website targeting residents of the United Arab Emirates and request that it be suspended.", "",
    `URL reported: ${e.url}`, l.finalUrl && l.finalUrl !== e.url ? `Lands on: ${l.finalUrl}` : "", `Domain: ${l.finalDomain || l.domain}`,
    l.hosting?.ip ? `IP address: ${l.hosting.ip}${l.hosting.org ? " (" + l.hosting.org + ")" : ""}` : "",
    `First seen: ${b.first_seen} UTC. Captured: ${e.at} UTC.`, "",
    "Why it is fraudulent:", ...reasons, b.assessment?.summary ? "- " + b.assessment.summary : "", "",
    s.report ? `Independent scan: ${s.report}` : "", s.sha256 ? `Screenshot SHA-256: ${s.sha256}` : "", `Evidence record SHA-256: ${e.sha256}`, `Case reference: ${b.case_id}`, "",
    "Thank you."
  ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n");
  const subject = `Abuse report: fraudulent website ${l.finalDomain || l.domain}`;
  const to = [e.abuse?.registrarEmail, e.abuse?.host?.email].filter(Boolean);
  return { to, subject, body, href: `mailto:${to.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

export default function Evidence() {
  const { t } = useLang();
  const [pw, setPw] = useState(null);
  const [id, setId] = useState(null);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let p = null; try { p = sessionStorage.getItem("radar-pw"); } catch {}
    const i = new URLSearchParams(location.search).get("id");
    setPw(p); setId(i);
    fetch(`/api/admin/evidence?id=${encodeURIComponent(i || "")}`, { headers: p ? { "x-admin-password": p } : {} })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || t("eLoad")); setData(j); })
      .catch(e => setErr(e.message));
  }, []);

  async function capture() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin/evidence", { method: "POST", headers: { "content-type": "application/json", ...(pw ? { "x-admin-password": pw } : {}) }, body: JSON.stringify({ id }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || t("eLoad"));
      setData(j);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (err && !data) return <main className="wrap narrow"><div className="err" role="alert">{err}</div><p><a href="/admin">{t("evBack")}</a></p></main>;
  if (!data) return <main className="wrap narrow"><p className="note"><span className="spin" /> {t("evLoading")}</p></main>;
  const b = data.bundle, a = b.assessment || {};
  const ents = ENT.filter(k => (b.entities?.[k] || []).length);

  return (
    <main className="wrap evd">
      <div className="no-print row" style={{ marginTop: 16 }}>
        <a className="btn ghost sm" href="/admin">{t("evBack")}</a>
        <button className="btn sm" onClick={() => window.print()}>{t("evPrint")}</button>
        <button className="btn ghost sm" onClick={() => download(`radar-aman-evidence-${b.case_id}.json`, JSON.stringify({ ...b, screenshots: data.images }, null, 2), "application/json")}>{t("evJson")}</button>
        {data.role === "admin" && <button className="btn ghost sm" onClick={capture} disabled={busy}>{busy ? <><span className="spin" />{t("evCapturing")}</> : t("evCapture")}</button>}
        {err && <span className="err" style={{ margin: 0 }}>{err}</span>}
      </div>
      {busy && <p className="note no-print">{t("evCaptureD")}</p>}

      <header className="evd-head">
        <div>
          <h1>{t("evTitle")}</h1>
          <div className="mono">CASE {b.case_id}</div>
        </div>
        <div className="evd-meta ltr">
          <div>Generated: {b.generated_at} UTC</div>
          <div>{dubai(b.generated_at)}</div>
        </div>
      </header>

      <section className="evd-sec">
        <h2>{t("evSummary")}</h2>
        <dl className="li-facts">
          <div><dt>{t("evScore")}</dt><dd><span className={`pill ${riskCls(a.risk_score || 0)}`}>{a.risk_score}</span> {a.verdict}</dd></div>
          <div><dt>{t("evType")}</dt><dd dir="auto">{a.scam_type || "—"}</dd></div>
          {a.impersonated && <div><dt>{t("evImp")}</dt><dd dir="auto">{a.impersonated}</dd></div>}
          <div><dt>{t("platform")}</dt><dd>{b.platform}</dd></div>
          <div><dt>{t("evFirst")}</dt><dd className="ltr">{b.first_seen}<br />{dubai(b.first_seen)}</dd></div>
          <div><dt>{t("evStatus")}</dt><dd>{b.status}{b.user_reports ? ` · ${t("userReports", { n: b.user_reports })}` : ""}</dd></div>
          {b.source_url && <div><dt>{t("evSource")}</dt><dd className="ltr" style={{ wordBreak: "break-all" }}>{b.source_url}</dd></div>}
        </dl>
        {a.summary && <p dir="auto">{a.summary}</p>}
      </section>

      <section className="evd-sec">
        <h2>{t("evContent")}</h2>
        {b.content?.text && <pre className="evd-text" dir="auto">{b.content.text}</pre>}
        {data.thumbs?.length > 0 && <div className="evd-thumbs">{data.thumbs.map((s, i) => <img key={i} src={s} alt="" />)}</div>}
        <div className="evid">content SHA-256 {b.content?.content_sha256 || "—"}</div>
      </section>

      <section className="evd-sec">
        <h2>{t("evCaptures")}</h2>
        {!(b.evidence || []).length && <p className="note">{t("evNoCaptures")}</p>}
        {(b.evidence || []).map((e, i) => {
          const s = e.screenshot || {}, img = s.key && data.images[s.key];
          return (
            <div className="evd-cap" key={i}>
              <div className="evd-cap-head"><b>#{i + 1}</b> <span className="ltr">{e.at} UTC · {dubai(e.at)}</span></div>
              <div className="evd-cap-body">
                <div className="evd-shot">
                  {img ? <img src={`data:${s.mime || "image/jpeg"};base64,${img}`} alt="" /> : <div className="note">{s.error ? t("evShotFail") + ": " + s.error : t("evShotNone")}</div>}
                  {s.sha256 && <div className="evid">image SHA-256 {s.sha256}<br />{s.provider}{s.bytes ? ` · ${Math.round(s.bytes / 1024)} KB` : ""}</div>}
                  {s.report && <div className="note ltr"><a href={s.report} target="_blank" rel="noopener noreferrer">{s.report}</a></div>}
                </div>
                <ul className="flags" style={{ flex: 1 }}><LinkCard l={e.intel} /></ul>
              </div>
              <div className="evid">record SHA-256 {e.sha256}</div>
              {(() => { const td = takedown(b, e); return (
                <div className="evd-abuse">
                  <b>{t("evAbuse")}</b>{" "}
                  <span className="note ltr">{[e.abuse?.registrar && `${e.abuse.registrar}${e.abuse.registrarEmail ? " <" + e.abuse.registrarEmail + ">" : ""}`, e.abuse?.host?.email && `${e.abuse.host.network || "host"} <${e.abuse.host.email}>`].filter(Boolean).join(" · ") || t("evAbuseNone")}</span>
                  <div className="row no-print" style={{ marginTop: 6 }}>
                    <a className="btn ghost sm" href={td.href}>{t("evAbuseMail")}</a>
                    <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(td.subject + "\n\n" + td.body)}>{t("evAbuseCopy")}</button>
                  </div>
                </div>); })()}
            </div>
          );
        })}
      </section>

      {(b.links_at_scan || []).length > 0 && (
        <section className="evd-sec">
          <h2>{t("evLinksAtScan")}</h2>
          <ul className="flags">{b.links_at_scan.map((l, i) => <LinkCard key={i} l={l} />)}</ul>
        </section>
      )}

      <section className="evd-sec">
        <h2>{t("entT")}</h2>
        {ents.length ? ents.map(k => <div key={k} className="ent"><span className="lbl">{t("e_" + k)}</span>{b.entities[k].map((x, i) => <code key={i}>{x}</code>)}</div>) : <p className="note">{t("noEnt")}</p>}
      </section>

      {(a.red_flags || []).length > 0 && (
        <section className="evd-sec">
          <h2>{t("flagsT")}</h2>
          <ol dir="auto">{a.red_flags.map((f, i) => <li key={i}><b>{f.title}</b>{f.detail ? `: ${f.detail}` : ""}</li>)}</ol>
        </section>
      )}

      {b.deep_check && (
        <section className="evd-sec">
          <h2>{t("deepT")}</h2>
          <p dir="auto">{b.deep_check.summary}</p>
          <ol dir="auto">{(b.deep_check.findings || []).filter(f => f.level !== "none").map((f, i) => <li key={i}><b>{f.title}</b>: {f.detail}</li>)}</ol>
          {(b.deep_check.sources || []).length > 0 && <div className="note ltr">{b.deep_check.sources.map((s, i) => <div key={i}>{s}</div>)}</div>}
        </section>
      )}

      {(b.linked_cases || []).length > 0 && (
        <section className="evd-sec">
          <h2>{t("evLinked")}</h2>
          <div className="mono">{b.linked_cases.join("  ·  ")}</div>
        </section>
      )}

      <footer className="evd-foot">
        <div className="evid">bundle SHA-256 {b.bundle_sha256}</div>
        <p className="note">{t("evVerify")}</p>
      </footer>
    </main>
  );
}
