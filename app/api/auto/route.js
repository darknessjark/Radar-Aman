// Automatic monitoring entry: receives ads found in the Meta Ad Library (Instagram + Facebook)
// by the daily scheduled monitor. Hard cap per day keeps the cost small.
import { runScan } from "@/lib/scan";
import { redis, allowToday } from "@/lib/db";
import { json, fail } from "../_util";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  const key = process.env.AUTO_KEY;
  if (!key || req.headers.get("x-auto-key") !== key) return json({ error: "غير مصرح" }, 401);
  try {
    const body = await req.json();
    const ads = (Array.isArray(body.ads) ? body.ads : []).slice(0, 5);
    const cap = +process.env.AUTO_DAILY_LIMIT || 3;
    const db = redis();
    const out = [];
    for (const a of ads) {
      const id = String(a.id || "").slice(0, 40);
      if (!/^\d{5,25}$/.test(id)) { out.push({ id, skipped: "bad id" }); continue; }
      const fresh = await db.sadd("auto:seen", id);
      if (!fresh) { out.push({ id, skipped: "already scanned" }); continue; }
      if (!(await allowToday("auto", cap))) { await db.srem("auto:seen", id); out.push({ id, skipped: "daily cap" }); break; }
      const page = String(a.pageName || "").slice(0, 120);
      const title = String(a.title || "").slice(0, 300);
      const kw = String(a.keyword || "").slice(0, 80);
      const text = `إعلان من مكتبة إعلانات ميتا (الإمارات)\nاسم الصفحة المعلنة: ${page}\nعنوان الإعلان: ${title}\nكلمة الرصد: ${kw}\nملاحظة: التحليل مبني على اسم الصفحة والعنوان فقط، بدون صورة الإعلان.`;
      const r = await runScan({ platform: "فيسبوك", sourceUrl: `https://www.facebook.com/ads/library/?id=${id}`, text }, "رصد آلي");
      out.push(r.error ? { id, error: r.error } : { id, caseId: r.case.id, score: r.case.result?.risk_score ?? null });
    }
    return json({ results: out });
  } catch (e) { return fail(e); }
}
