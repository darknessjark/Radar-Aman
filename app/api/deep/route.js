import { getCase, saveCase, allowToday } from "@/lib/db";
import { deepCheck } from "@/lib/ai";
import { json, fail, role } from "../_util";
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
    // The public may run the deep check once per case (one retry if it failed); officers can re-run it.
    if (!role(req) && ((c.deep && c.deep.status !== "failed") || (c.deepRuns || 0) >= 2))
      return json({ error: "الفحص المعمّق يُجرى مرة واحدة لكل حالة. | The deep check runs once per case." }, 403);
    const limit = +process.env.DAILY_DEEP_LIMIT || 40;
    if (!(await allowToday("deep", limit))) return json({ error: "تم الوصول للحد اليومي للفحص المعمّق. حاول غدًا." }, 429);
    c.deepRuns = (c.deepRuns || 0) + 1;
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
