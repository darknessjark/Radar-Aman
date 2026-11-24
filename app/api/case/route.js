import { getCase, listCases } from "@/lib/db";
import { linkedTo } from "@/lib/networks";
import { json, fail } from "../_util";
import { publicView } from "@/lib/scan";
export const runtime = "nodejs";
export async function GET(req) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    const c = await getCase(id);
    if (!c) return json({ error: "الحالة غير موجودة" }, 404);
    const all = await listCases(300);
    return json(publicView(c, linkedTo(c, all)));
  } catch (e) { return fail(e); }
}
