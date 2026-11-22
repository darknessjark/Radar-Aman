import { listCases } from "@/lib/db";
import { json, fail, isAdmin } from "../../_util";
export const runtime = "nodejs";
export async function GET(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try { return json({ cases: await listCases(500) }); } catch (e) { return fail(e); }
}
