import { listCases } from "@/lib/db";
import { json, fail, isAdmin, role } from "../../_util";
export const runtime = "nodejs";
export async function GET(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try { return json({ cases: await listCases(500), role: role(req) }); } catch (e) { return fail(e); }
}
