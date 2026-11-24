// Live link inspection: opens the link the way a victim would, follows every redirect and short link,
// then looks up who registered the domain and when (RDAP), where it is hosted (IP, network, country),
// its HTTPS certificate, and what the landing page asks for. Ends with a 0-100 link score.
//
// Safety: only http/https on ports 80/443, every hop is resolved first and private or internal
// addresses are refused (no SSRF into our own infrastructure), bodies are capped, and every step
// has a timeout. Nothing on the page is executed.
import dns from "dns/promises";
import net from "net";
import tls from "tls";
import { linkCheck, cleanDomain, SHORTENERS, SOCIAL } from "./linkcheck";
import { officialMatch } from "./official";

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const MAX_HOPS = 8, HOP_MS = 6000, BODY_MAX = 300_000;
const ms = n => AbortSignal.timeout(n);

// Free website builders and app hosts: anyone can put a page here in a minute, and the domain age
// belongs to the platform, not to the person behind the page.
export const FREE_HOSTS = ["pages.dev", "workers.dev", "vercel.app", "netlify.app", "firebaseapp.com", "web.app", "github.io", "gitlab.io",
  "weebly.com", "weeblysite.com", "wixsite.com", "wix.com", "blogspot.com", "wordpress.com", "000webhostapp.com", "ngrok.io", "ngrok-free.app",
  "glitch.me", "repl.co", "replit.app", "square.site", "godaddysites.com", "webflow.io", "framer.app", "framer.website", "carrd.co", "jimdosite.com",
  "mystrikingly.com", "sites.google.com", "googleusercontent.com", "appspot.com", "herokuapp.com", "onrender.com", "fly.dev", "surge.sh",
  "azurewebsites.net", "web.core.windows.net", "blob.core.windows.net", "r2.dev", "s3.amazonaws.com", "ipfs.io", "dweb.link", "translate.goog",
  "typedream.app", "tilda.ws", "ucraft.site", "yolasite.com", "site123.me", "webnode.page", "myshopify.com", "linktr.ee", "bio.link", "t.ly"];
// Content delivery networks and big clouds: thousands of unrelated sites share these addresses.
export { SHARED_INFRA } from "./infra";
const MULTI_SUFFIX = ["co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "net.au", "org.au", "co.nz", "co.za", "com.br", "com.sa", "gov.sa", "com.eg", "com.tr", "co.in", "co.jp", "com.cn",
  "com.pk", "com.ng", "co.id", "com.my", "com.sg", "com.hk", "com.mx", "com.ar", "co.ke", "com.qa", "com.kw", "com.bh", "com.om", "co.ae", "net.ae", "org.ae", "gov.ae", "ac.ae", "sch.ae", "mil.ae"];

export const registrable = h => {
  const p = cleanDomain(h).split(".");
  if (p.length <= 2) return p.join(".");
  const last2 = p.slice(-2).join(".");
  return MULTI_SUFFIX.includes(last2) ? p.slice(-3).join(".") : last2;
};
const freeHostOf = h => FREE_HOSTS.find(f => h === f || h.endsWith("." + f)) || null;
const onList = (h, list) => list.some(x => h === x || h.endsWith("." + x));

// ---------- Address safety ----------
function privateIP(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224 || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  const x = ip.toLowerCase();
  if (x.startsWith("::ffff:")) return privateIP(x.slice(7));
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb");
}
async function resolveSafe(hostname) {
  const h = hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(h) ? [{ address: h }] : await dns.lookup(h, { all: true });
  if (!addrs.length) throw new Error("DNS");
  if (addrs.some(a => privateIP(a.address))) throw new Error("PRIVATE");
  return addrs.map(a => a.address);
}

// ---------- Following the link ----------
function normalise(u) {
  let s = String(u || "").trim().replace(/[)\].,'"!?؛،]+$/, "");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  const url = new URL(s);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("SCHEME");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("PORT");
  url.username = ""; url.password = "";
  return url;
}
async function readCapped(res) {
  const reader = res.body?.getReader?.();
  if (!reader) return "";
  const chunks = []; let n = 0;
  while (n < BODY_MAX) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); n += value.length; }
  try { reader.cancel(); } catch {}
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks.map(c => Buffer.from(c))).subarray(0, BODY_MAX));
}
const decodeEntities = s => s.replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/").replace(/&#47;/g, "/").replace(/&quot;/g, '"');
function softRedirect(html, base) {
  const m = /<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["']?\s*\d+\s*;\s*url\s*=\s*([^"'>\s]+)/i.exec(html)
    || /(?:window\.|document\.|top\.)?location(?:\.href)?\s*=\s*["'](https?:\/\/[^"']+)["']/i.exec(html)
    || /location\.(?:replace|assign)\(\s*["'](https?:\/\/[^"']+)["']\s*\)/i.exec(html);
  if (!m) return null;
  try { return new URL(decodeEntities(m[1]), base).toString(); } catch { return null; }
}

export async function follow(input) {
  const chain = [];
  let url = normalise(input), html = "", finalStatus = null, contentType = "", soft = 0, ips = [];
  for (let i = 0; i <= MAX_HOPS; i++) {
    ips = await resolveSafe(url.hostname);
    let res;
    try {
      res = await fetch(url, { redirect: "manual", signal: ms(HOP_MS), headers: { "user-agent": UA, accept: "text/html,*/*;q=0.8", "accept-language": "ar,en;q=0.8" } });
    } catch (e) {
      chain.push({ url: url.toString(), status: null, error: /timeout|abort/i.test(String(e?.name || e)) ? "timeout" : "unreachable" });
      return { chain, finalUrl: url.toString(), finalStatus: null, html: "", ips, contentType: "", reached: false };
    }
    const loc = res.headers.get("location");
    chain.push({ url: url.toString(), status: res.status });
    if (res.status >= 300 && res.status < 400 && loc) {
      try { res.body?.cancel?.(); } catch {}
      url = normalise(new URL(loc, url).toString());
      continue;
    }
    finalStatus = res.status; contentType = res.headers.get("content-type") || "";
    html = /html|text\/plain|^$/i.test(contentType) ? await readCapped(res) : "";
    const next = soft < 2 && html.length < 60_000 ? softRedirect(html, url) : null;
    if (next && next !== url.toString()) { soft++; chain[chain.length - 1].soft = true; url = normalise(next); continue; }
    break;
  }
  return { chain, finalUrl: url.toString(), finalStatus, html, ips, contentType, reached: true };
}

// ---------- Who, where, since when ----------
const vcardName = ent => { try { return (ent.vcardArray?.[1] || []).find(x => x[0] === "fn")?.[3] || null; } catch { return null; } };
let bootstrap = null, bootstrapAt = 0;
async function rdapBase(tld) {
  if (!bootstrap || Date.now() - bootstrapAt > 864e5) {
    try {
      const r = await fetch("https://data.iana.org/rdap/dns.json", { signal: ms(8000) });
      if (r.ok) { const j = await r.json(); bootstrap = {}; (j.services || []).forEach(([tlds, urls]) => tlds.forEach(t => (bootstrap[t] = urls.find(u => u.startsWith("https")) || urls[0]))); bootstrapAt = Date.now(); }
    } catch {}
  }
  return bootstrap?.[tld] || null;
}
function parseRdap(j) {
  const ev = a => (j.events || []).find(e => e.eventAction === a)?.eventDate || null;
  const registrar = (j.entities || []).find(e => (e.roles || []).includes("registrar"));
  const created = ev("registration");
  return {
    available: true, created, updated: ev("last changed"), expires: ev("expiration"),
    ageDays: created ? Math.floor((Date.now() - Date.parse(created)) / 864e5) : null,
    registrar: registrar ? vcardName(registrar) || registrar.handle || null : null,
    nameservers: (j.nameservers || []).map(n => String(n.ldhName || "").toLowerCase()).filter(Boolean).sort().slice(0, 4),
    status: (j.status || []).slice(0, 4)
  };
}
// Registry RDAP first (found through IANA's bootstrap list), then rdap.org as a fallback. One retry on 429.
export async function rdapDomain(d) {
  const tld = d.split(".").pop();
  const base = await rdapBase(tld);
  const urls = [base && `${base.replace(/\/$/, "")}/domain/${encodeURIComponent(d)}`, `https://rdap.org/domain/${encodeURIComponent(d)}`].filter(Boolean);
  let note = base ? null : "no RDAP for ." + tld;
  for (const u of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(u, { signal: ms(7000), headers: { accept: "application/rdap+json, application/json" } });
        if (r.status === 429 && attempt === 0) { await new Promise(x => setTimeout(x, 1500 + Math.random() * 1500)); continue; }
        if (r.ok) return parseRdap(await r.json());
        note = r.status === 404 ? "not found in RDAP" : "RDAP " + r.status;
      } catch { note = "RDAP unreachable"; }
      break;
    }
  }
  return { available: false, note };
}
export async function ipInfo(ip) {
  try {
    const tok = process.env.IPINFO_TOKEN ? `?token=${process.env.IPINFO_TOKEN}` : "";
    const r = await fetch(`https://ipinfo.io/${ip}/json${tok}`, { signal: ms(5000) });
    if (r.ok) { const j = await r.json(); if (j.org || j.country) return { ip, org: j.org || null, country: j.country || null, city: j.city || null }; }
  } catch {}
  try {
    const r = await fetch(`https://rdap.org/ip/${ip}`, { signal: ms(6000) });
    if (r.ok) { const j = await r.json(); return { ip, org: j.name || null, country: j.country || null, city: null }; }
  } catch {}
  return { ip, org: null, country: null, city: null };
}
export function tlsInfo(hostname, ip) {
  return new Promise(resolve => {
    let done = false;
    const end = v => { if (!done) { done = true; try { s.destroy(); } catch {} resolve(v); } };
    const s = tls.connect({ host: ip, servername: net.isIP(hostname) ? undefined : hostname, port: 443, rejectUnauthorized: false, timeout: 5000 }, () => {
      const c = s.getPeerCertificate();
      if (!c || !c.valid_from) return end(null);
      end({ issuer: c.issuer?.O || c.issuer?.CN || null, subject: c.subject?.CN || null, validFrom: new Date(c.valid_from).toISOString(), validTo: new Date(c.valid_to).toISOString(),
        trusted: s.authorized, ageDays: Math.floor((Date.now() - Date.parse(c.valid_from)) / 864e5) });
    });
    s.on("error", () => end(null)); s.on("timeout", () => end(null));
    setTimeout(() => end(null), 6000);
  });
}

// ---------- What the landing page asks for ----------
// Brands that phishing pages copy. [name, pattern, the brand's own domains]. UAE bodies are all on the official list.
const BRANDS = [["TAMM", /\btamm\b|منصة تم|تم أبوظبي/i, []], ["Abu Dhabi Police", /abu ?dhabi police|شرطة أبوظبي|شرطة ابوظبي/i, []], ["Dubai Police", /dubai police|شرطة دبي/i, []],
  ["UAE PASS", /uae ?pass|الهوية الرقمية/i, []], ["ICP", /federal authority for identity|الهيئة الاتحادية للهوية/i, []], ["MOI", /ministry of interior|وزارة الداخلية/i, []],
  ["RTA", /roads (and|&) transport authority|هيئة الطرق والمواصلات/i, []], ["Salik", /\bsalik\b/i, []], ["Emirates Post", /emirates ?post|بريد الإمارات/i, []],
  ["Aramex", /\baramex\b|أرامكس/i, []], ["Etisalat / e&", /\betisalat\b|اتصالات الإمارات/i, []], ["DEWA", /\bdewa\b|هيئة كهرباء ومياه دبي/i, []],
  ["ADCB", /\badcb\b|بنك أبوظبي التجاري/i, []], ["FAB", /first abu dhabi bank|بنك أبوظبي الأول/i, []], ["Emirates NBD", /emirates ?nbd|الإمارات دبي الوطني/i, []],
  ["ADIB", /\badib\b|مصرف أبوظبي الإسلامي/i, []], ["Mashreq", /\bmashreq\b|بنك المشرق/i, []], ["RAKBANK", /\brakbank\b/i, []], ["DIB", /dubai islamic bank|بنك دبي الإسلامي/i, []],
  ["MOHRE", /\bmohre\b|وزارة الموارد البشرية/i, []],
  ["Microsoft", /\bmicrosoft\b|office ?365|\boutlook\b|\bonedrive\b|sharepoint/i, ["microsoft.com", "live.com", "office.com", "microsoftonline.com", "outlook.com", "sharepoint.com", "onedrive.com", "office365.com", "bing.com", "msn.com", "skype.com", "xbox.com"]],
  ["Apple", /\bapple ?id\b|\bicloud\b|\bapple\b/i, ["apple.com", "icloud.com"]], ["PayPal", /paypal/i, ["paypal.com", "paypal.me"]], ["Netflix", /netflix/i, ["netflix.com"]],
  ["Amazon", /\bamazon\b/i, ["amazon.com", "amazon.ae", "amazon.sa", "amazon.co.uk", "amazon.de", "aws.amazon.com", "amazonaws.com"]], ["DHL", /\bdhl\b/i, ["dhl.com", "dhl.de"]],
  ["FedEx", /fedex/i, ["fedex.com"]], ["UPS", /\bups\b/i, ["ups.com"]], ["Meta", /\bfacebook\b|\binstagram\b|\bmeta\b/i, ["facebook.com", "instagram.com", "meta.com", "fb.com", "messenger.com"]],
  ["WhatsApp", /whatsapp/i, ["whatsapp.com", "whatsapp.net"]], ["Google", /\bgmail\b|\bgoogle\b/i, ["google.com", "gmail.com", "youtube.com", "google.ae", "googleusercontent.com", "googleapis.com", "gstatic.com", "googlevideo.com", "withgoogle.com"]],
  ["Binance", /binance/i, ["binance.com"]], ["Coinbase", /coinbase/i, ["coinbase.com"]], ["MetaMask", /metamask/i, ["metamask.io"]], ["Wells Fargo", /wells ?fargo/i, ["wellsfargo.com"]],
  ["Chase", /\bchase\b/i, ["chase.com"]], ["Bank of America", /bank of america/i, ["bankofamerica.com"]], ["LinkedIn", /linkedin/i, ["linkedin.com"]],
  ["Adobe", /\badobe\b/i, ["adobe.com"]], ["DocuSign", /docusign/i, ["docusign.com", "docusign.net"]], ["Dropbox", /dropbox/i, ["dropbox.com"]], ["Steam", /steam ?community|\bsteam\b/i, ["steampowered.com", "steamcommunity.com"]]];
const THIRD_PARTY = /(protected by )?google re-?captcha|(sign ?in|log ?in|continue|sign ?up|register) (with|using|via) (google|apple|facebook|microsoft|linkedin|github)|re-?captcha|google (llc|privacy|terms|play)|app ?store|apple pay|google pay|samsung pay|paypal (checkout|button)|powered by [a-z]+|privacy policy and terms of service apply/gi;
const brandOwn = (own, reg, host) => own.some(d => reg === d || host === d || host.endsWith("." + d));
// Well-known brand names inside a host name that the brand does not own (netflix-billing.top, paypal.secure-login.com).
const NAME_TOKENS = [["Microsoft", ["microsoft", "office365", "outlook", "onedrive", "sharepoint", "hotmail"]], ["Apple", ["apple", "icloud", "appleid"]], ["PayPal", ["paypal"]],
  ["Netflix", ["netflix"]], ["Amazon", ["amazon"]], ["DHL", ["dhl"]], ["FedEx", ["fedex"]], ["Meta", ["facebook", "instagram"]], ["WhatsApp", ["whatsapp"]], ["Google", ["google", "gmail"]],
  ["Binance", ["binance"]], ["Coinbase", ["coinbase"]], ["MetaMask", ["metamask"]], ["Wells Fargo", ["wellsfargo"]], ["Bank of America", ["bankofamerica"]], ["LinkedIn", ["linkedin"]],
  ["DocuSign", ["docusign"]], ["Dropbox", ["dropbox"]]];
export function brandInName(host) {
  const h = cleanDomain(host), reg = registrable(h);
  const toks = h.split(/[.\-_\d]+/).filter(Boolean);
  for (const [name, words] of NAME_TOKENS) {
    const own = (BRANDS.find(b => b[0] === name)?.[2]) || [];
    if (brandOwn(own, reg, h)) continue;
    if (toks.some(t => words.some(w => t === w || (w.length >= 6 && t.includes(w))))) return name;
  }
  return null;
}
export function pageSignals(html, finalHost = "") {
  if (!html) return null;
  const reg = registrable(finalHost);
  const title = (/<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(html)?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 140) || null;
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").slice(0, 120000);
  const bodyText = text.replace(THIRD_PARTY, " ");
  const inputs = (html.match(/<input[^>]*>/gi) || []).join(" ");
  const hasPassword = /type\s*=\s*["']?password/i.test(inputs);
  const hasCard = /(card.?number|cardnum|cc.?num|\bcvv\b|\bcvc\b|expiry|exp.?date|رقم البطاقة|تاريخ الانتهاء)/i.test(inputs) || (/<input/i.test(html) && /(\bcvv\b|\bcvc\b|رقم البطاقة)/i.test(text));
  const hasOtp = /(\botp\b|one.?time.?(pass|code)|رمز التحقق)/i.test(inputs) || (/<input/i.test(html) && /(\botp\b|رمز التحقق|one.?time.?(password|code))/i.test(text));
  const notOwn = ([, , own]) => !brandOwn(own, reg, finalHost);
  const titleBrands = BRANDS.filter(b => notOwn(b) && b[1].test(title || "")).map(b => b[0]);
  const bodyBrands = BRANDS.filter(b => notOwn(b) && b[1].test(bodyText)).map(b => b[0]);
  return { title, hasPassword, hasCard, hasOtp, titleBrands: titleBrands.slice(0, 3), bodyBrands: bodyBrands.slice(0, 4), forms: (html.match(/<form\b/gi) || []).length };
}

// ---------- Putting it together ----------
const F = (level, t, e, pts = 0) => ({ level, t, e, pts });

export async function inspect(input) {
  const started = Date.now();
  const out = { input: String(input).slice(0, 500), checkedAt: new Date().toISOString() };
  let url;
  try { url = normalise(input); } catch { return { ...out, error: "رابط غير صالح", flags: [], score: null }; }
  const startHost = url.hostname.toLowerCase().replace(/^www\./, "");
  out.domain = startHost;

  let f;
  try { f = await follow(url.toString()); }
  catch (e) {
    const m = String(e?.message || e);
    const why = m === "PRIVATE" ? "عنوان داخلي أو خاص — لا يُفتح" : m === "DNS" || /ENOTFOUND|EAI_AGAIN/.test(m) ? "النطاق لا يعمل (لا يوجد عنوان له)" : m === "PORT" ? "منفذ غير معتاد — لا يُفتح" : "تعذر فتح الرابط";
    f = { chain: [{ url: url.toString(), status: null, error: why }], finalUrl: url.toString(), reached: false, ips: [], html: "" };
    out.blocked = m === "PRIVATE" || m === "PORT";
  }
  const final = new URL(f.finalUrl);
  const finalHost = final.hostname.toLowerCase().replace(/^www\./, "");
  const reg = registrable(finalHost), freeHost = freeHostOf(finalHost), official = officialMatch(finalHost);
  out.chain = f.chain; out.finalUrl = f.finalUrl; out.finalDomain = finalHost; out.registrable = reg; out.reached = f.reached;
  out.httpStatus = f.finalStatus ?? null; out.freeHost = freeHost; out.official = official;

  const ip = f.ips?.[0] || null;
  const [rdap, host, cert] = await Promise.all([
    freeHost || official ? Promise.resolve(null) : rdapDomain(reg),
    ip ? ipInfo(ip) : Promise.resolve(null),
    ip && final.protocol === "https:" ? tlsInfo(final.hostname, ip) : Promise.resolve(null)
  ]);
  out.whois = rdap; out.hosting = host; out.tls = cert; out.page = pageSignals(f.html, finalHost);
  out.ips = (f.ips || []).slice(0, 3);

  // ---- Signals ----
  const flags = [];
  const nameFlags = linkCheck([finalHost])[0]?.flags || [];
  const startFlags = startHost !== finalHost ? (linkCheck([startHost])[0]?.flags || []) : [];
  [...startFlags, ...nameFlags].forEach(x => { if (x.level === "red" || x.level === "amber") flags.push(F(x.level, x.t, x.e || x.t, x.level === "red" ? 35 : 10)); });

  if (official) {
    flags.push(F("green", `يوصل للموقع الرسمي (${official})`, `Leads to the official site (${official})`));
  } else {
    if (SHORTENERS.includes(startHost) && startHost !== finalHost) flags.push(F("amber", `رابط مختصر يحوّل إلى ${finalHost}`, `Short link that leads to ${finalHost}`, 10));
    else if (registrable(startHost) !== reg && f.chain.length > 1) flags.push(F("amber", `الرابط يحوّلك لموقع آخر: ${finalHost}`, `The link sends you to another site: ${finalHost}`, 10));
    if (f.chain.length >= 4) flags.push(F("amber", `سلسلة تحويلات طويلة (${f.chain.length - 1})`, `Long redirect chain (${f.chain.length - 1})`, 10));
    const nameBrand = brandInName(finalHost);
    if (nameBrand) flags.push(F("red", `اسم الموقع فيه اسم ${nameBrand} وهو ليس موقعها الرسمي`, `The site name contains ${nameBrand} but it is not ${nameBrand}'s site`, 35));
    if (freeHost) flags.push(F("amber", `صفحة على منصة مجانية (${freeHost}) يقدر أي أحد ينشئها خلال دقائق`, `Page on a free hosting platform (${freeHost}) anyone can set up in minutes`, 20));
    if (rdap?.ageDays != null) {
      if (rdap.ageDays < 30) flags.push(F("red", `الدومين عمره ${rdap.ageDays} يوم فقط`, `The domain is only ${rdap.ageDays} days old`, 40));
      else if (rdap.ageDays < 180) flags.push(F("amber", `الدومين جديد: عمره ${rdap.ageDays} يوم`, `New domain: ${rdap.ageDays} days old`, 20));
      else if (rdap.ageDays >= 730) flags.push(F("green", `الدومين قديم: مسجل منذ ${Math.floor(rdap.ageDays / 365)} سنوات`, `Established domain: registered ${Math.floor(rdap.ageDays / 365)} years ago`, -10));
    } else if (cert?.ageDays != null && cert.ageDays < 10 && !freeHost) {
      flags.push(F("amber", `عمر الدومين غير متاح، وشهادة HTTPS صدرت قبل ${cert.ageDays} أيام`, `Domain age unavailable, and the HTTPS certificate was issued ${cert.ageDays} days ago`, 10));
    }
    const p = out.page;
    const established = rdap?.ageDays != null && rdap.ageDays >= 730;
    const copies = !!(p?.titleBrands?.length || ((p?.hasCard || p?.hasPassword || p?.hasOtp) && p?.bodyBrands?.length));
    if (p && (p.hasCard || p.hasPassword || p.hasOtp) && !(established && !copies)) {
      const what = [p.hasCard && "بيانات بطاقة", p.hasPassword && "كلمة مرور", p.hasOtp && "رمز تحقق"].filter(Boolean).join(" و");
      const whatE = [p.hasCard && "card details", p.hasPassword && "a password", p.hasOtp && "a one-time code"].filter(Boolean).join(" and ");
      flags.push(F("red", `الصفحة تطلب ${what} وهي ليست موقعًا رسميًا`, `The page asks for ${whatE} and is not an official site`, 30));
    }
    const asks = p && (p.hasCard || p.hasPassword || p.hasOtp);
    const brandHit = p ? [...new Set([...(p.titleBrands || []), ...(asks ? p.bodyBrands || [] : [])])] : [];
    if (brandHit.length) flags.push(F("red", `الصفحة تستخدم اسم ${brandHit.join("، ")} وهي ليست موقعه الرسمي`, `The page uses the name ${brandHit.join(", ")} but is not its official site`, asks ? 45 : 25));
    if (f.reached && final.protocol === "http:" && p && (p.hasCard || p.hasPassword)) flags.push(F("amber", "يطلب بيانات بدون اتصال آمن (HTTPS)", "Asks for details without a secure (HTTPS) connection", 10));
    if (!f.reached && !out.blocked) flags.push(F("none", f.chain[f.chain.length - 1]?.error || "تعذر فتح الرابط", "The link could not be opened (it may already be taken down)"));
  }
  if (host?.org) flags.push(F("none", `مستضاف لدى ${host.org}${host.country ? " (" + host.country + ")" : ""}`, `Hosted by ${host.org}${host.country ? " (" + host.country + ")" : ""}`));
  if (rdap?.registrar) flags.push(F("none", `المسجّل: ${rdap.registrar}`, `Registrar: ${rdap.registrar}`));

  const seen = new Set();
  out.flags = flags.filter(x => !seen.has(x.t) && seen.add(x.t));
  out.score = official ? 0 : Math.max(0, Math.min(100, out.flags.reduce((a, x) => a + (x.pts || 0), 0)));
  out.level = out.score >= 60 ? "red" : out.score >= 30 ? "amber" : official ? "green" : "none";
  out.tookMs = Date.now() - started;
  return out;
}

// Links worth opening: full URLs or bare domains, but not social platforms (the account is checked instead) or WhatsApp.
export function urlsFrom(...parts) {
  const s = parts.filter(Boolean).join(" \n ");
  const found = s.match(/\bhttps?:\/\/[^\s<>"'،]+|\b(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,24}(?:\/[^\s<>"'،]*)?/gi) || [];
  const out = [], hosts = new Set();
  for (const raw of found) {
    let u; try { u = normalise(raw); } catch { continue; }
    const h = u.hostname.replace(/^www\./, "");
    if (/@/.test(raw) || /\.(png|jpe?g|gif|webp)$/i.test(u.pathname) || /^\d+\.\d+$/.test(h)) continue;
    if (onList(h, SOCIAL) && !SHORTENERS.includes(h)) continue;
    if (h === "wa.me" || h.endsWith("whatsapp.com") || ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "icloud.com"].includes(h)) continue;
    if (hosts.has(u.hostname + u.pathname)) continue;
    hosts.add(u.hostname + u.pathname); out.push(u.toString());
  }
  return out.slice(0, 6);
}

// Inspect several links at once with an overall time limit per link.
export async function inspectMany(urls, { max = 3, perLinkMs = 15000 } = {}) {
  const list = [...new Set(urls)].slice(0, max);
  return Promise.all(list.map(u => Promise.race([
    inspect(u),
    new Promise(r => setTimeout(() => r({ input: u, checkedAt: new Date().toISOString(), error: "انتهت مهلة الفحص", flags: [], score: null }), perLinkMs))
  ])));
}

// One line per link for the AI prompt.
export function intelSummary(list) {
  return (list || []).map(l => {
    if (l.error) return `${l.input}: ${l.error}`;
    const bits = [];
    if (l.finalDomain && l.finalDomain !== l.domain) bits.push(`يحوّل إلى ${l.finalDomain}`);
    if (l.official) bits.push(`نطاق رسمي مؤكد (${l.official})`);
    if (l.whois?.ageDays != null) bits.push(`عمر الدومين ${l.whois.ageDays} يوم`);
    if (l.hosting?.org) bits.push(`الاستضافة ${l.hosting.org}${l.hosting.country ? " " + l.hosting.country : ""}`);
    if (l.page?.title) bits.push(`عنوان الصفحة «${l.page.title.slice(0, 80)}»`);
    (l.flags || []).filter(x => x.level === "red" || x.level === "amber").forEach(x => bits.push(x.t));
    if (!l.reached) bits.push("لم يُفتح");
    return `${l.input}: ${bits.join("؛ ") || "لا مؤشرات"} (درجة الرابط ${l.score ?? "?"})`;
  }).join("\n");
}
