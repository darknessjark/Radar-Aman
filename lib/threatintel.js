// Threat intelligence: is this link already known to be phishing or malware?
// 1. Google Safe Browsing (needs GOOGLE_SAFE_BROWSING_KEY, free).
// 2. Public feeds refreshed daily and kept in Redis: OpenPhish community feed, Phishing.Database
//    (links and domains first seen today) and URLhaus (malware links currently online).
// Hosts are only used when they belong to one site; on shared platforms (github.com, drive.google.com,
// free site builders) only the exact link counts, so one bad page never condemns the whole platform.
import { redis } from "./db";
import { isOfficial } from "./official";
import { FREE_HOSTS, registrable, inspect } from "./linkintel";

const FEEDS = [
  ["OpenPhish", "https://openphish.com/feed.txt", "url"],
  ["Phishing.Database", "https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-links-NEW-today.txt", "url"],
  ["Phishing.Database", "https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-NEW-today.txt", "host"],
  ["URLhaus", "https://urlhaus.abuse.ch/downloads/text_online/", "url"]
];
const SHARED = ["github.com", "githubusercontent.com", "google.com", "googleusercontent.com", "googleapis.com", "dropbox.com", "dropboxusercontent.com", "microsoft.com",
  "sharepoint.com", "onedrive.live.com", "1drv.ms", "live.com", "amazonaws.com", "cloudfront.net", "discord.com", "discordapp.com", "cdn.discordapp.com", "t.me", "telegram.org",
  "bit.ly", "tinyurl.com", "linktr.ee", "facebook.com", "instagram.com", "whatsapp.com", "youtube.com", "mediafire.com", "mega.nz", "gitlab.com", "bitbucket.org", "archive.org"];
const shared = h => [...SHARED, ...FREE_HOSTS].some(s => h === s || h.endsWith("." + s));

export const normUrl = u => { try { const x = new URL(String(u).trim()); x.hash = ""; return (x.protocol + "//" + x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase(); } catch { return null; } };
const hostOf = u => { try { return new URL(/^https?:/i.test(u) ? u : "https://" + u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } };

// ---------- Daily refresh ----------
export async function refreshFeeds() {
  const db = redis();
  const urls = new Set(), hosts = new Set(), counts = {};
  for (const [name, url, kind] of FEEDS) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "user-agent": "RadarAman/1.0 (+https://radar-aman.vercel.app)" } });
      if (!r.ok) { counts[name + ":" + kind] = "HTTP " + r.status; continue; }
      const lines = (await r.text()).split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith("#")).slice(0, 60000);
      let n = 0;
      for (const l of lines) {
        const h = hostOf(l);
        if (!h || isOfficial(h)) continue;
        if (kind === "url") { const nu = normUrl(/^https?:/i.test(l) ? l : "http://" + l); if (nu) { urls.add(nu); n++; } }
        if (!shared(h)) { hosts.add(h); if (kind === "host") n++; }
      }
      counts[name + ":" + kind] = n;
    } catch (e) { counts[name + ":" + kind] = "error"; }
  }
  if (!urls.size && !hosts.size) throw new Error("all threat feeds failed");
  // Build new sets beside the old ones, then swap, so lookups never see a half-built list.
  for (const [key, set] of [["ti:urls", urls], ["ti:hosts", hosts]]) {
    const tmp = key + ":new", list = [...set];
    await db.del(tmp);
    for (let i = 0; i < list.length; i += 2000) await db.sadd(tmp, ...list.slice(i, i + 2000));
    if (list.length) await db.rename(tmp, key);
  }
  const meta = { refreshedAt: new Date().toISOString(), urls: urls.size, hosts: hosts.size, counts };
  await db.set("ti:meta", meta);
  return meta;
}

// ---------- Lookups ----------
export async function feedLookup(linkUrls) {
  const db = redis();
  const us = [...new Set(linkUrls.map(normUrl).filter(Boolean))];
  const hs = [...new Set(linkUrls.map(hostOf).filter(h => h && !shared(h) && !isOfficial(h)))];
  const hits = [];
  try {
    const ur = us.length ? await db.smismember("ti:urls", us) : [];
    us.forEach((u, i) => ur[i] && hits.push({ match: u, kind: "url" }));
    const hr = hs.length ? await db.smismember("ti:hosts", hs) : [];
    hs.forEach((h, i) => hr[i] && hits.push({ match: h, kind: "host" }));
  } catch { return null; }
  return hits;
}

export async function safeBrowsing(linkUrls) {
  const key = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!key) return null;
  const entries = [...new Set(linkUrls.filter(Boolean))].slice(0, 20).map(url => ({ url }));
  try {
    const r = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(key)}`, {
      method: "POST", signal: AbortSignal.timeout(6000), headers: { "content-type": "application/json" },
      body: JSON.stringify({ client: { clientId: "radar-aman", clientVersion: "1.0" }, threatInfo: { threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"], platformTypes: ["ANY_PLATFORM"], threatEntryTypes: ["URL"], threatEntries: entries } })
    });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.matches || []).map(m => ({ match: m.threat?.url, type: m.threatType }));
  } catch { return null; }
}

// Live link check + threat intelligence on every address in the redirect chain.
export async function checkLink(u, { ti = true } = {}) {
  const l = await inspect(u);
  if (!ti || l.error) return l;
  const addrs = [l.input, ...(l.chain || []).map(c => c.url), l.finalUrl].filter(Boolean);
  const [feeds, sb] = await Promise.all([feedLookup(addrs).catch(() => null), safeBrowsing(addrs)]);
  l.threat = { checkedAt: new Date().toISOString(), safeBrowsing: sb, feeds, sbEnabled: !!process.env.GOOGLE_SAFE_BROWSING_KEY };
  const hit = (sb || []).length || (feeds || []).length;
  if (hit && !l.official) {
    const src = [...new Set([...(sb || []).map(() => "Google Safe Browsing"), ...(feeds || []).length ? ["قوائم الاحتيال العامة"] : []])];
    const srcE = [...new Set([...(sb || []).map(() => "Google Safe Browsing"), ...(feeds || []).length ? ["public phishing feeds"] : []])];
    l.flags.unshift({ level: "red", t: `الرابط مُدرج في قوائم التهديدات (${src.join("، ")})`, e: `The link is listed as a known threat (${srcE.join(", ")})`, pts: 70 });
    l.score = Math.max(l.score || 0, 90);
    l.level = "red";
    l.listed = true;
  }
  return l;
}

export async function checkMany(urls, { max = 3, perLinkMs = 18000, ti = true } = {}) {
  const list = [...new Set(urls)].slice(0, max);
  return Promise.all(list.map(u => Promise.race([
    checkLink(u, { ti }),
    new Promise(r => setTimeout(() => r({ input: u, checkedAt: new Date().toISOString(), error: "انتهت مهلة الفحص", flags: [], score: null }), perLinkMs))
  ])));
}

export const tiMeta = async () => { try { return await redis().get("ti:meta"); } catch { return null; } };
export { registrable };
