// New look-alike domains. GET → last 14 days (officers and judges). POST → scan now (officers).
import { runAndStore, recent } from "@/lib/nrdstore";
import { json, fail, isAdmin, canWrite, readOnly } from "../../_util";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try { return json({ days: await recent(14) }); } catch (e) { return fail(e); }
}
export async function POST(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  if (!canWrite(req)) return readOnly();
  try { await runAndStore(); return json({ days: await recent(14) }); }
  catch (e) { return /NRD/.test(String(e?.message)) ? json({ error: "تعذر تنزيل قائمة الدومينات الجديدة الآن: " + e.message }, 502) : fail(e); }
}
