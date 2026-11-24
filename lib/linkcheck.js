// Link check without any network calls: looks at the domain name only.
import { isOfficial } from "./official";
export const OFFICIAL = {
  adpolice: ["adpolice.gov.ae"], police: ["adpolice.gov.ae", "dubaipolice.gov.ae", "moi.gov.ae"], shurta: ["adpolice.gov.ae"], moi: ["moi.gov.ae"],
  tamm: ["tamm.abudhabi"], uaepass: ["uaepass.ae"], icp: ["icp.gov.ae"], customs: ["adcustoms.gov.ae", "dubaicustoms.gov.ae", "fca.gov.ae"],
  rta: ["rta.ae"], dewa: ["dewa.gov.ae"], sewa: ["sewa.gov.ae"], etisalat: ["etisalat.ae", "eand.com"], emiratespost: ["emiratespost.ae"],
  aramex: ["aramex.com"], adcb: ["adcb.com"], bankfab: ["bankfab.com"], emiratesnbd: ["emiratesnbd.com"], adib: ["adib.ae"],
  mashreq: ["mashreq.com"], mohre: ["mohre.gov.ae"], salik: ["salik.ae"], darb: ["itc.gov.ae"], consumer: ["moec.gov.ae"], moec: ["moec.gov.ae"]
};
export const SHORTENERS = ["bit.ly", "tinyurl.com", "cutt.ly", "t.ly", "rb.gy", "is.gd", "shorturl.at", "tiny.cc", "ow.ly", "s.id"];
const BAD_TLD = ["xyz", "top", "shop", "online", "site", "click", "info", "buzz", "live", "icu", "store", "vip", "win", "cfd", "sbs", "rest", "lol", "cyou", "monster"];
export const SOCIAL = ["instagram.com", "tiktok.com", "snapchat.com", "facebook.com", "fb.com", "x.com", "twitter.com", "youtube.com", "linktr.ee"];
const MAIL = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "icloud.com"];

export function cleanDomain(x) {
  return String(x || "").toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[\/?#:\s]/)[0];
}

export function domainsFrom(...parts) {
  const s = parts.filter(Boolean).join(" ");
  const out = new Set();
  (s.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9][a-z0-9.-]*\.[a-z]{2,}|xn--[a-z0-9.-]+)(?=[\/\s:?#"'\)]|$)/gi) || []).forEach(m => {
    const d = cleanDomain(m);
    if (MAIL.includes(d)) return;
    if ((d.includes(".") && /[a-z]/.test(d)) || /^\d{1,3}(\.\d{1,3}){3}$/.test(d)) out.add(d);
  });
  return [...out].slice(0, 6);
}

export function linkCheck(domains) {
  const res = [];
  [...new Set(domains.map(cleanDomain).filter(d => d.includes(".")))].slice(0, 6).forEach(d => {
    const isOff = isOfficial(d) || Object.values(OFFICIAL).flat().some(o => d === o || d.endsWith("." + o));
    const f = [];
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(d)) f.push({ level: "red", t: "رابط برقم IP بدل اسم موقع", e: "Link uses a raw IP address instead of a site name" });
    if (d.includes("xn--")) f.push({ level: "red", t: "اسم نطاق بأحرف مموّهة (Punycode) يستخدم لتقليد المواقع", e: "Disguised domain characters (Punycode), used to imitate real sites" });
    if (SOCIAL.some(s => d === s || d.endsWith("." + s))) { res.push({ domain: d, flags: [{ level: "none", t: "رابط منصة تواصل — يُفحص الحساب نفسه", e: "Social platform link — the account itself should be checked" }] }); return; }
    if (d === "wa.me" || d.endsWith("whatsapp.com")) { res.push({ domain: d, flags: [{ level: "amber", t: "رابط واتساب مباشر — سحب الضحية خارج المنصة", e: "Direct WhatsApp link — moves the victim off the platform" }] }); return; }
    if (d.endsWith(".gov.ae") || isOff) f.push({ level: "green", t: "نطاق رسمي معروف", e: "Known official domain" });
    else {
      const toks = d.split(/[.\-]/);
      const hit = Object.entries(OFFICIAL).find(([k]) => toks.some(t => t === k || (k.length >= 5 && t.includes(k))));
      if (hit) f.push({ level: "red", t: `يشبه اسم جهة رسمية (${hit[0]}) لكنه ليس موقعها الرسمي — الرسمي: ${hit[1][0]}`, e: `Resembles an official body (${hit[0]}) but is not its real site — official: ${hit[1][0]}` });
      if (/gov/.test(d) && !/(^|\.)gov(\.[a-z]{2})?$/.test(d)) f.push({ level: "red", t: "يحتوي «gov» لكنه ليس نطاقًا حكوميًا إماراتيًا (.gov.ae)", e: "Contains “gov” but is not a UAE government domain (.gov.ae)" });
      if (SHORTENERS.includes(d)) f.push({ level: "amber", t: "رابط مختصر يخفي الوجهة الحقيقية", e: "Shortened link that hides the real destination" });
      const tld = d.split(".").pop();
      if (BAD_TLD.includes(tld)) f.push({ level: "amber", t: `امتداد .${tld} شائع في المواقع الاحتيالية`, e: `The .${tld} ending is common on scam sites` });
      if ((d.match(/-/g) || []).length >= 2) f.push({ level: "amber", t: "اسم طويل بشرطات متعددة — نمط شائع في المواقع المقلدة", e: "Long name with several hyphens — common in imitation sites" });
      if (/(pay|fine|fines|refund|verify|update|secure|login|track|parcel|auction|mazad|offer)/.test(d)) f.push({ level: "amber", t: "كلمات دفع/تحقق/تتبع في اسم الموقع", e: "Payment, verification or tracking words in the site name" });
      if (!f.length) f.push({ level: "none", t: "لا مؤشرات واضحة من الاسم — يحتاج فحصًا معمّقًا لعمر الموقع وسمعته", e: "No clear signs from the name alone — needs a deep check of site age and reputation" });
    }
    const seen = new Set();
    res.push({ domain: d, flags: f.filter(x => !seen.has(x.t) && seen.add(x.t)) });
  });
  return res;
}
