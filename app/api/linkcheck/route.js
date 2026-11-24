// Link inspection for automatic collectors (the same key as the daily monitor). No AI call.
// GET ?key=&url=  → one link.  POST {urls:[...]} with x-auto-key → up to 10 links.
import { inspect } from "@/lib/linkintel";
import { allowToday } from "@/lib/db";
import { json, fail } from "../_util";
export const runtime = "nodejs";
export const maxDuration = 120;

const authed = given => { const key = process.env.AUTO_KEY; return !!key && given === key; };
const timed = u => Promise.race([inspect(u), new Promise(r => setTimeout(() => r({ input: u, checkedAt: new Date().toISOString(), error: "انتهت مهلة الفحص", flags: [], score: null }), 20000))]);
async function run(urls) {
  const list = [...new Set(urls.map(u => String(u || "").trim()).filter(Boolean))].slice(0, 10);
  if (!list.length) return json({ error: "لا توجد روابط" }, 400);
  const limit = +process.env.DAILY_BATCH_LIMIT || 1000;
  for (let i = 0; i < list.length; i++) if (!(await allowToday("batch", limit))) return json({ error: "daily cap" }, 429);
  return json({ rows: await Promise.all(list.map(timed)) });
}
export async function GET(req) {
  const u = new URL(req.url);
  if (!authed(u.searchParams.get("key"))) return json({ error: "غير مصرح" }, 401);
  try { return await run(u.searchParams.getAll("url")); } catch (e) { return fail(e); }
}
export async function POST(req) {
  if (!authed(req.headers.get("x-auto-key"))) return json({ error: "غير مصرح" }, 401);
  try { const { urls } = await req.json(); return await run(Array.isArray(urls) ? urls : []); } catch (e) { return fail(e); }
}
