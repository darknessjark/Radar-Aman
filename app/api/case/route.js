import { getCase, listCases } from "@/lib/db";
import { linkedTo } from "@/lib/networks";
import { json, fail } from "../_util";
export const runtime = "nodejs";
export async function GET(req) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    const c = await getCase(id);
    if (!c) return json({ error: "الحالة غير موجودة" }, 404);
    const all = await listCases(300);
    const links = linkedTo(c, all).map(l => ({ id: l.o.id, shared: l.shared, platform: l.o.platform, score: l.o.result?.risk_score ?? null }));
    return json({ case: c, links });
  } catch (e) { return fail(e); }
}
