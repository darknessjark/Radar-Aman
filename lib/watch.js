// Watch new look-alike domains until they go live. Most are registered days before the scam starts:
// each day we open the high-risk ones again, and the first time a scam page appears it becomes a case.
import crypto from "crypto";
import { redis, saveCase } from "./db";
import { recent } from "./nrdstore";
import { checkLink } from "./threatintel";

const PER_RUN = +process.env.WATCH_PER_RUN || 25;
// "Live" means the page itself shows a trap, not just that a new look-alike domain answers (parking pages do).
const live = l => !l.error && l.reached && !l.official && !!(l.listed || l.page?.hasCard || l.page?.hasPassword || l.page?.hasOtp || l.page?.titleBrands?.length || l.page?.telegram || l.page?.offsiteForm?.length || l.cloak?.differs && l.page?.bodyBrands?.length);
const timed = (u, ms = 20000) => Promise.race([checkLink(u), new Promise(r => setTimeout(() => r(null), ms))]);

function caseFrom(hit, l) {
  const reds = (l.flags || []).filter(f => f.level === "red" || f.level === "amber");
  const score = Math.max(70, l.score || 0);
  return {
    id: crypto.randomBytes(9).toString("hex"), createdAt: new Date().toISOString(), platform: "موقع إلكتروني", sourceUrl: l.finalUrl || l.input,
    text: `رصد مبكر: دومين جديد يقلد ${hit.brand}، سُجّل في ${hit.date} وظهرت عليه صفحة.`, thumbs: [], phash: [], status: "جديد", source: "رصد مبكر", lang: "ar",
    hash: crypto.createHash("sha256").update(JSON.stringify({ d: hit.domain, at: l.checkedAt })).digest("hex"),
    result: {
      risk_score: score, verdict: score >= 70 ? "احتيال مرجّح" : "مشبوه", scam_type: `انتحال ${hit.brand} (دومين جديد)`, impersonated_entity: hit.brand, confidence: "متوسطة",
      summary: `دومين سُجّل حديثًا باسم يقلد ${hit.brand} وصار عليه موقع يعمل. ${reds.slice(0, 2).map(f => f.t).join("؛ ")}`,
      reasons: [`اسم الموقع يقلد ${hit.brand}`, ...reds.slice(0, 3).map(f => f.t)], red_flags: reds.slice(0, 6).map(f => ({ title: f.t, detail: l.finalDomain || l.domain })),
      positive_signals: [], entities: { domains: [l.finalDomain || hit.domain], urls: [l.finalUrl || hit.domain], phones: [], ibans: [], accounts: [], emails: [] },
      tactics: ["انتحال جهة رسمية", "رابط مشبوه"], officer_action: "التقط الأدلة من ملف الأدلة وأرسل طلب الإيقاف للمسجّل والاستضافة قبل انتشار الرابط.",
      citizen_advice: "لا تدخل بياناتك في هذا الموقع، والجهة الرسمية لها موقع واحد معروف.", link_intel: [l]
    }
  };
}

export async function watchLookalikes() {
  const db = redis();
  const days = await recent(10);
  const hits = days.flatMap(d => d.hits.filter(h => h.level === "high").map(h => ({ ...h, date: d.date })));
  const state = (await db.hgetall("nrd:watch")) || {};
  const seenD = new Set();
  const due = hits.filter(h => !seenD.has(h.domain) && seenD.add(h.domain)).filter(h => { const s = state[h.domain]; return !s || (!s.caseId && Date.now() - Date.parse(s.at || 0) > 20 * 36e5); }).slice(0, PER_RUN);
  const out = { checked: 0, wentLive: [] };
  for (let i = 0; i < due.length; i += 5) {
    await Promise.all(due.slice(i, i + 5).map(async h => {
      const l = await timed(h.domain).catch(() => null);
      out.checked++;
      const prev = state[h.domain] || {};
      const rec = { at: new Date().toISOString(), checks: (prev.checks || 0) + 1, status: !l || l.error || !l.reached ? "down" : live(l) ? "live" : "parked", score: l?.score ?? null };
      if (rec.status === "live") {
        const c = caseFrom(h, l);
        await saveCase(c);
        rec.caseId = c.id; out.wentLive.push({ domain: h.domain, caseId: c.id });
      }
      await db.hset("nrd:watch", { [h.domain]: rec });
    }));
  }
  return out;
}
export const watchState = async () => { try { return (await redis().hgetall("nrd:watch")) || {}; } catch { return {}; } };
