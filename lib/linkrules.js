// Rules applied in code after the model answers, so two things never depend on the model alone:
// 1. a link that is dangerous when actually opened raises the score;
// 2. a genuine bank or government link is never called a scam just because the ad names a bank.
import { isHotline } from "./networks";

const privatePhones = phones => (phones || []).map(p => String(p).replace(/\D/g, "")).filter(d => d.length >= 7 && !isHotline(d));

export function applyLinkRules(result, intel, { text = "", sourceUrl = "", lang = "ar", injected = false } = {}) {
  const en = lang === "en";
  const ok = (intel || []).filter(l => !l.error);
  result.red_flags = Array.isArray(result.red_flags) ? result.red_flags : [];
  result.positive_signals = Array.isArray(result.positive_signals) ? result.positive_signals : [];

  // 1. Dangerous link: the opened page itself is the evidence.
  const worst = ok.filter(l => !l.official).sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  if (worst && worst.score >= 60) {
    const why = worst.flags.filter(f => f.level === "red").slice(0, 2).map(f => (en ? f.e : f.t)).join(en ? "; " : "؛ ");
    result.red_flags.unshift({ title: worst.listed ? (en ? "The link is a known threat" : "الرابط مُدرج في قوائم التهديدات") : en ? "The link is dangerous when opened" : "الرابط خطير عند فتحه", detail: `${worst.finalDomain || worst.domain}: ${why}` });
    const floor = worst.listed ? 90 : 75;
    if (result.risk_score < floor) { result.risk_score = floor; result.verdict = "احتيال مرجّح"; }
    result.link_rule = "dangerous-link";
    return result;
  }

  // 2. Official guard: every link really ends on an official site, and the ad asks for no private
  //    contact or payment route (personal phone, IBAN, WhatsApp). Mentioning a bank never counts.
  const e = result.entities || {};
  const allOfficial = ok.length > 0 && ok.length === (intel || []).length && ok.every(l => l.official && (!l.finalDomain || l.official));
  const privateRoute = privatePhones(e.phones).length > 0 || (e.ibans || []).length > 0 || /wa\.me|whatsapp|واتس/i.test(text + " " + sourceUrl);
  if (allOfficial && !privateRoute && !injected) {
    const names = [...new Set(ok.map(l => l.official))].join(en ? ", " : "، ");
    result.positive_signals.unshift(en ? `Every link leads to the official site (${names})` : `كل الروابط توصل للموقع الرسمي (${names})`);
    if (result.risk_score > 20) {
      result.risk_score = 15; result.verdict = "منخفض الخطورة";
      result.scam_type = "لا يوجد";
      result.summary = en ? `The link leads to the official site (${names}) and the ad asks for no private payment or contact. Still use the official app or website directly.` : `الرابط يوصل للموقع الرسمي (${names}) والإعلان لا يطلب دفعًا أو تواصلًا عبر قناة خاصة. ومع ذلك ادخل للتطبيق أو الموقع الرسمي مباشرة.`;
    }
    result.link_rule = "official";
  } else if (ok.some(l => l.official) && privateRoute) {
    result.red_flags.push({ title: en ? "Official link, private payment route" : "رابط رسمي مع قناة دفع خاصة", detail: en ? "The link is genuine, but the ad also sends you to a personal number, WhatsApp or bank account. Official bodies do not do this." : "الرابط حقيقي، لكن الإعلان يوجهك أيضًا لرقم شخصي أو واتساب أو حساب بنكي. الجهات الرسمية لا تفعل ذلك." });
    result.link_rule = "official-but-private";
  }
  return result;
}
