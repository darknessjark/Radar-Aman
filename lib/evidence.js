// Evidence for police: a timestamped snapshot of each link (redirects, WHOIS, hosting, certificate,
// what the page asks for) plus a screenshot of the landing page, each with a SHA-256 fingerprint,
// and a bundle that can be exported as JSON or printed to PDF.
import crypto from "crypto";
import { inspect } from "./linkintel";
import { redis } from "./db";

export const sha256 = data => crypto.createHash("sha256").update(data).digest("hex");
// Stable JSON (sorted keys) so the same content always gives the same fingerprint.
export const canonical = v => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v && typeof v === "object"
  ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",")}}` : JSON.stringify(v ?? null);

const TTL = () => 60 * 60 * 24 * (+process.env.EVIDENCE_TTL_DAYS || 180);
const MAX_IMG = 700_000;

async function grab(url, ms = 20000) {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error("image " + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  return { buf, mime: r.headers.get("content-type")?.split(";")[0] || "image/png" };
}

// urlscan.io (needs URLSCAN_API_KEY): independent third-party record with a permanent result page.
async function urlscan(url) {
  const key = process.env.URLSCAN_API_KEY;
  const s = await fetch("https://urlscan.io/api/v1/scan/", { method: "POST", signal: AbortSignal.timeout(15000), headers: { "API-Key": key, "content-type": "application/json" },
    body: JSON.stringify({ url, visibility: process.env.URLSCAN_VISIBILITY || "unlisted", tags: ["radar-aman"] }) });
  const sj = await s.json().catch(() => ({}));
  if (!s.ok || !sj.uuid) throw new Error("urlscan: " + (sj.message || s.status));
  const until = Date.now() + 100_000;
  await new Promise(r => setTimeout(r, 12000));
  while (Date.now() < until) {
    const r = await fetch(`https://urlscan.io/api/v1/result/${sj.uuid}/`, { signal: AbortSignal.timeout(10000) });
    if (r.status === 200) {
      const j = await r.json();
      let img = null;
      try { img = await grab(`https://urlscan.io/screenshots/${sj.uuid}.png`); } catch {}
      const p = j.page || {};
      return { provider: "urlscan.io", report: `https://urlscan.io/result/${sj.uuid}/`, img,
        extra: { finalUrl: p.url, ip: p.ip, asn: p.asn, asnName: p.asnname, country: p.country, server: p.server, tlsIssuer: p.tlsIssuer, malicious: j.verdicts?.overall?.malicious ?? null } };
    }
    if (r.status !== 404) throw new Error("urlscan result " + r.status);
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error("urlscan: timed out");
}

// microlink.io: free screenshot in a phone-sized window (how victims usually see these pages).
async function microlink(url) {
  const q = new URLSearchParams({ url, screenshot: "true", meta: "false", "screenshot.type": "jpeg", waitForTimeout: "1500",
    "viewport.width": "390", "viewport.height": "844", "viewport.isMobile": "true", "viewport.deviceScaleFactor": "1" });
  const r = await fetch(`https://api.microlink.io/?${q}`, { signal: AbortSignal.timeout(45000), headers: process.env.MICROLINK_API_KEY ? { "x-api-key": process.env.MICROLINK_API_KEY } : {} });
  const j = await r.json().catch(() => ({}));
  const shot = j?.data?.screenshot?.url;
  if (j.status !== "success" || !shot) throw new Error("microlink: " + (j.message || j.code || r.status));
  return { provider: "microlink.io", report: null, img: await grab(shot), extra: null };
}

export async function screenshot(url) {
  if (process.env.URLSCAN_API_KEY) { try { return await urlscan(url); } catch (e) { const m = await microlink(url).catch(() => null); if (m) return { ...m, note: String(e.message || e) }; throw e; } }
  return microlink(url);
}

// One evidence record per link: fresh link check + screenshot, fingerprinted and stored.
export async function captureLink(caseId, url, n) {
  const at = new Date().toISOString();
  const [intel, shot] = await Promise.all([
    inspect(url),
    screenshot(url).catch(e => ({ error: String(e?.message || e).slice(0, 160) }))
  ]);
  const rec = { at, url, intel };
  if (shot.error) rec.screenshot = { error: shot.error };
  else {
    rec.screenshot = { provider: shot.provider, report: shot.report, extra: shot.extra, note: shot.note || null };
    if (shot.img) {
      rec.screenshot.sha256 = sha256(shot.img.buf);
      rec.screenshot.bytes = shot.img.buf.length;
      rec.screenshot.mime = shot.img.mime;
      if (shot.img.buf.length <= MAX_IMG) {
        const key = `shot:${caseId}:${n}`;
        await redis().set(key, shot.img.buf.toString("base64"), { ex: TTL() });
        rec.screenshot.key = key;
      } else rec.screenshot.note = "image too large to keep; fingerprint recorded";
    }
  }
  rec.sha256 = sha256(canonical(rec));
  return rec;
}

// Links of a case worth capturing: the opened links first, then the case's own link.
export function caseLinks(c) {
  const li = c.result?.link_intel || [];
  const list = li.filter(l => !l.error && !l.official).map(l => l.input);
  if (!list.length && c.sourceUrl && !/(instagram|facebook|tiktok|snapchat|x\.com|twitter)\./i.test(c.sourceUrl)) list.push(c.sourceUrl);
  return [...new Set(list)].slice(0, 2);
}

// Everything an investigator needs in one file, with a fingerprint over the whole bundle.
export function bundle(c, linkedIds = []) {
  const r = c.result || {};
  const b = {
    format: "radar-aman-evidence/1",
    generated_at: new Date().toISOString(),
    case_id: c.id,
    first_seen: c.createdAt,
    source: c.source,
    platform: c.platform,
    source_url: c.sourceUrl || null,
    content: { text: c.text || null, screenshots_attached: (c.thumbs || []).length, content_sha256: c.hash || null },
    assessment: {
      risk_score: c.deep?.status === "done" && typeof c.deep.score_after === "number" ? c.deep.score_after : r.risk_score,
      initial_score: r.risk_score, verdict: r.verdict, scam_type: r.scam_type, impersonated: r.impersonated_entity || null, confidence: r.confidence,
      red_flags: r.red_flags || [], summary: r.summary
    },
    entities: r.entities || {},
    links_at_scan: r.link_intel || [],
    deep_check: c.deep?.status === "done" ? { completed_at: c.deep.completedAt, summary: c.deep.summary, findings: c.deep.findings, sources: c.deep.sources } : null,
    evidence: c.evidence || [],
    linked_cases: linkedIds,
    status: c.status,
    user_reports: c.userReports || 0,
    note: "Timestamps are UTC (ISO 8601). Each evidence record and screenshot carries its own SHA-256; bundle_sha256 covers everything above it (canonical JSON, sorted keys)."
  };
  b.bundle_sha256 = sha256(canonical(b));
  return b;
}
