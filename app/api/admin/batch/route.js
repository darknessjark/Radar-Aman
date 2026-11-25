// Batch link check for officers: up to 10 links per request (the page sends a long list in chunks).
// Link inspection only, no AI call, so it costs nothing but time. Read-only, so judges may use it too.
import { checkLink } from "@/lib/threatintel";
import { aiLink, finalVerdict } from "@/lib/linkai";
import { allowToday } from "@/lib/db";
import { json, fail, isAdmin } from "../../_util";
export const runtime = "nodejs";
export const maxDuration = 120;

const PER_REQUEST = 10;
export async function POST(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try {
    const { urls, ai } = (await req.json().catch(() => null)) || {};
    const list = [...new Set((Array.isArray(urls) ? urls : []).map(u => String(u || "").trim()).filter(Boolean))].slice(0, PER_REQUEST);
    if (!list.length) return json({ error: "لا توجد روابط" }, 400);
    const limit = +process.env.DAILY_BATCH_LIMIT || 1000;
    for (let i = 0; i < list.length; i++) if (!(await allowToday("batch", limit))) return json({ error: "تم الوصول للحد اليومي لفحص الروابط. حاول غدًا." }, 429);
    const rows = await Promise.all(list.map(u => Promise.race([
      checkLink(u),
      new Promise(r => setTimeout(() => r({ input: u, checkedAt: new Date().toISOString(), error: "انتهت مهلة الفحص", flags: [], score: null }), 20000))
    ])));
    // Optional AI reading of each page (more accurate, slower, costs tokens; capped per day).
    if (ai) {
      const aiLimit = +process.env.DAILY_AI_LINK_LIMIT || 400;
      await Promise.all(rows.map(async r => {
        if (r.error) return;
        if (!(await allowToday("ailink", aiLimit))) { r.aiError = "daily cap"; return; }
        try { r.ai = await aiLink(r); } catch (e) { r.aiError = String(e?.message || e).slice(0, 100); }
      }));
    }
    rows.forEach(r => (r.verdict = finalVerdict(r, r.ai)));
    return json({ rows });
  } catch (e) { return fail(e); }
}
