// Batch link check for officers: up to 10 links per request (the page sends a long list in chunks).
// Link inspection only, no AI call, so it costs nothing but time. Read-only, so judges may use it too.
import { inspect } from "@/lib/linkintel";
import { allowToday } from "@/lib/db";
import { json, fail, isAdmin } from "../../_util";
export const runtime = "nodejs";
export const maxDuration = 120;

const PER_REQUEST = 10;
export async function POST(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try {
    const { urls } = await req.json();
    const list = [...new Set((Array.isArray(urls) ? urls : []).map(u => String(u || "").trim()).filter(Boolean))].slice(0, PER_REQUEST);
    if (!list.length) return json({ error: "لا توجد روابط" }, 400);
    const limit = +process.env.DAILY_BATCH_LIMIT || 1000;
    for (let i = 0; i < list.length; i++) if (!(await allowToday("batch", limit))) return json({ error: "تم الوصول للحد اليومي لفحص الروابط. حاول غدًا." }, 429);
    const rows = await Promise.all(list.map(u => Promise.race([
      inspect(u),
      new Promise(r => setTimeout(() => r({ input: u, checkedAt: new Date().toISOString(), error: "انتهت مهلة الفحص", flags: [], score: null }), 20000))
    ])));
    return json({ rows });
  } catch (e) { return fail(e); }
}
