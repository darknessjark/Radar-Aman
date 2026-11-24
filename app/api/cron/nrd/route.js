// Daily run: Vercel Cron (Authorization: Bearer CRON_SECRET) or the scheduled monitor (?key=AUTO_KEY).
import { runAndStore } from "@/lib/nrdstore";
import { json, fail } from "../../_util";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(req) {
  const u = new URL(req.url);
  const cron = process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  const key = process.env.AUTO_KEY && u.searchParams.get("key") === process.env.AUTO_KEY;
  if (!cron && !key) return json({ error: "غير مصرح" }, 401);
  try { const r = await runAndStore(); return json({ date: r.date, total: r.total, hits: r.hits.length, high: r.hits.filter(h => h.level === "high").length }); }
  catch (e) { return fail(e); }
}
