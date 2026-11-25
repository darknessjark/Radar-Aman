// Daily job: refresh threat lists, scan yesterday's new domains, re-check look-alikes until they go live.
// Called by Vercel Cron (Authorization: Bearer CRON_SECRET) or by the scheduled monitor (?key=AUTO_KEY).
import { daily } from "@/lib/daily";
import { json, fail } from "../../_util";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(req) {
  const u = new URL(req.url);
  const cron = process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  const key = process.env.AUTO_KEY && u.searchParams.get("key") === process.env.AUTO_KEY;
  if (!cron && !key) return json({ error: "غير مصرح" }, 401);
  try { return json(await daily()); } catch (e) { return fail(e); }
}
