import { getCase, saveCase, allowToday } from "@/lib/db";
import { deepCheck } from "@/lib/ai";
import { json, fail } from "../_util";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req) {
  let c;
  try {
    const { id } = await req.json();
    c = await getCase(id);
    if (!c) return json({ error: "الحالة غير موجودة" }, 404);
    if (c.deep?.status === "running" && Date.now() - Date.parse(c.deep.startedAt || 0) < 5 * 60 * 1000)
      return json({ error: "الفحص المعمّق جارٍ بالفعل لهذه الحالة، انتظر قليلًا." }, 409);
    const limit = +process.env.DAILY_DEEP_LIMIT || 40;
    if (!(await allowToday("deep", limit))) return json({ error: "تم الوصول للحد اليومي للفحص المعمّق. حاول غدًا." }, 429);
    c.deep = { status: "running", startedAt: new Date().toISOString() };
    await saveCase(c);
    const d = await deepCheck(c);
    c.deep = { status: "done", startedAt: c.deep.startedAt, completedAt: new Date().toISOString(), ...d };
    await saveCase(c);
    return json({ case: c });
  } catch (e) {
    if (c) { try { c.deep = { status: "failed", summary: "تعذر إكمال الفحص المعمّق، يمكن إعادة المحاولة." }; await saveCase(c); } catch {} }
    return fail(e);
  }
}
