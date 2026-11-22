import { getCase, saveCase, deleteCase } from "@/lib/db";
import { json, fail, isAdmin } from "../../_util";
export const runtime = "nodejs";
const STATUSES = ["جديد", "قيد المراجعة", "تم طلب الحذف من المنصة", "محوّل للتحقيق", "آمن — لا إجراء"];
export async function POST(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try {
    const { id, status, remove } = await req.json();
    const c = await getCase(id);
    if (!c) return json({ error: "الحالة غير موجودة" }, 404);
    if (remove) { await deleteCase(id); return json({ ok: true }); }
    if (!STATUSES.includes(status)) return json({ error: "حالة غير صالحة" }, 400);
    c.status = status; await saveCase(c);
    return json({ ok: true, case: c });
  } catch (e) { return fail(e); }
}
