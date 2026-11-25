// New look-alike domains. GET → last 14 days + watch state (officers and judges). POST → run the daily job now (officers).
import { recent } from "@/lib/nrdstore";
import { watchState } from "@/lib/watch";
import { tiMeta } from "@/lib/threatintel";
import { daily } from "@/lib/daily";
import { json, fail, isAdmin, canWrite, readOnly } from "../../_util";
export const runtime = "nodejs";
export const maxDuration = 300;
const view = async () => ({ days: await recent(14), watch: await watchState(), feeds: await tiMeta() });
export async function GET(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try { return json(await view()); } catch (e) { return fail(e); }
}
export async function POST(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  if (!canWrite(req)) return readOnly();
  try { const run = await daily(); return json({ ...(await view()), run }); } catch (e) { return fail(e); }
}
