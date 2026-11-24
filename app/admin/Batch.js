"use client";
import { Fragment, useRef, useState } from "react";
import { useLang } from "../components/Lang";
import { LinkCard } from "../components/LinkIntel";

const CHUNK = 10, MAX = 200;

// Pull links out of pasted text or a .txt/.csv file: one per line, or anywhere in the text.
export function extractLinks(s) {
  const out = [];
  String(s || "").split(/[\r\n,;\t ]+/).forEach(x => {
    const v = x.trim().replace(/^["'<(]+|[>"')\].,]+$/g, "");
    if (/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,24}(:\d+)?([/?#]\S*)?$/i.test(v)) out.push(v);
  });
  return [...new Set(out)];
}

// Sends links to the server in chunks and reports progress.
export async function runLinks(urls, pw, onRows) {
  const all = [];
  for (let i = 0; i < urls.length; i += CHUNK) {
    const part = urls.slice(i, i + CHUNK);
    const r = await fetch("/api/admin/batch", { method: "POST", headers: { "content-type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ urls: part }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "batch failed");
    all.push(...j.rows);
    onRows && onRows([...all]);
  }
  return all;
}

const csvCell = v => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCSV(rows, extra = {}) {
  const cols = ["input", ...Object.keys(extra), "final_url", "final_domain", "link_score", "level", "official", "free_host", "domain_age_days", "domain_created", "registrar", "nameservers",
    "ip", "hosting_org", "hosting_country", "tls_issuer", "tls_valid_from", "http_status", "redirects", "page_title", "asks_card", "asks_password", "asks_otp", "brands_copied", "reasons", "checked_at", "error"];
  const lines = rows.map((r, i) => [
    r.input, ...Object.values(extra).map(f => f(r, i)), r.finalUrl, r.finalDomain, r.score, r.level, r.official || "", r.freeHost || "", r.whois?.ageDays ?? "", r.whois?.created || "", r.whois?.registrar || "",
    (r.whois?.nameservers || []).join(" "), r.hosting?.ip || "", r.hosting?.org || "", r.hosting?.country || "", r.tls?.issuer || "", r.tls?.validFrom || "", r.httpStatus ?? "",
    Math.max(0, (r.chain || []).length - 1), r.page?.title || "", r.page?.hasCard ? 1 : 0, r.page?.hasPassword ? 1 : 0, r.page?.hasOtp ? 1 : 0,
    [...new Set([...(r.page?.titleBrands || []), ...(r.page?.bodyBrands || [])])].join(" "),
    (r.flags || []).filter(f => f.level === "red" || f.level === "amber").map(f => f.e || f.t).join(" | "), r.checkedAt, r.error || ""
  ].map(csvCell).join(","));
  return "﻿" + [cols.join(","), ...lines].join("\r\n");
}
export function download(name, text, type = "text/csv;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function Batch({ pw, show }) {
  const { t } = useLang();
  const [txt, setTxt] = useState("");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(null);
  const file = useRef();
  const links = extractLinks(txt).slice(0, MAX);

  async function run() {
    setBusy(true); setRows([]); setTotal(links.length); setOpen(null);
    try { await runLinks(links, pw, setRows); }
    catch (e) { show(e.message); } finally { setBusy(false); }
  }
  async function onFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2_000_000) return show(t("bTooBig"));
    setTxt(await f.text()); e.target.value = "";
  }
  const lv = l => (l === "red" ? "red" : l === "amber" ? "amber" : l === "green" ? "green" : "");
  const counts = { red: rows.filter(r => r.level === "red").length, amber: rows.filter(r => r.level === "amber").length };

  return (<>
    <p className="note" style={{ marginTop: 0 }}>{t("bIntro")}</p>
    <textarea className="ltr" style={{ width: "100%", minHeight: 140, textAlign: "left" }} value={txt} onChange={e => setTxt(e.target.value)} placeholder={"https://example.com\nbit.ly/abc\ntamm-fines.top"} />
    <div className="row" style={{ marginTop: 10 }}>
      <button className="btn" onClick={run} disabled={busy || !links.length}>{busy ? <><span className="spin" />{t("bRunning", { n: rows.length, m: total })}</> : t("bRun", { n: links.length })}</button>
      <button className="btn ghost" onClick={() => file.current?.click()} disabled={busy}>{t("bFile")}</button>
      <input ref={file} type="file" accept=".txt,.csv,text/plain,text/csv" hidden onChange={onFile} />
      {rows.length > 0 && !busy && <button className="btn ghost" onClick={() => download(`radar-aman-links-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows))}>{t("bCsv")}</button>}
      {extractLinks(txt).length > MAX && <span className="note">{t("bMax", { n: MAX })}</span>}
    </div>
    {rows.length > 0 && <p className="note">{t("bSummary", { n: rows.length, r: counts.red, a: counts.amber })}</p>}
    {rows.length > 0 && (
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>{t("bLink")}</th><th>{t("bFinal")}</th><th>{t("bScore")}</th><th>{t("li_age")}</th><th>{t("li_host")}</th><th>{t("bWhy")}</th></tr></thead>
          <tbody>{rows.map((r, i) => (<Fragment key={i}>
            <tr onClick={() => setOpen(open === i ? null : i)} style={{ cursor: "pointer" }}>
              <td className="ltr">{String(r.input).slice(0, 50)}</td>
              <td className="ltr">{r.finalDomain && r.finalDomain !== r.domain ? r.finalDomain : ""}</td>
              <td>{typeof r.score === "number" ? <span className={`pill ${lv(r.level)}`}>{r.score}</span> : "—"}</td>
              <td>{r.whois?.ageDays != null ? t("li_days", { n: r.whois.ageDays }) : r.official ? t("bOfficial") : r.freeHost ? r.freeHost : "—"}</td>
              <td dir="auto">{[r.hosting?.org, r.hosting?.country].filter(Boolean).join(" · ") || "—"}</td>
              <td dir="auto">{r.error || (r.flags || []).filter(f => f.level === "red" || f.level === "amber").slice(0, 2).map(f => f.t).join("؛ ") || "—"}</td>
            </tr>
            {open === i && <tr><td colSpan={6}><ul className="flags"><LinkCard l={r} /></ul></td></tr>}
          </Fragment>))}</tbody>
        </table>
      </div>
    )}
  </>);
}
