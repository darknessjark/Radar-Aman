import { getCase, saveCase, allowToday } from "@/lib/db";
import { json, fail } from "../_util";
export const runtime = "nodejs";
// A visitor reports the ad to Radar Aman. Reports collect in the officer dashboard,
// and the team raises them with the platform through its own channels.
export async function POST(req) {
  try {
    const { id } = await req.json();
    const c = await getCase(id);
    if (!c) return json({ error: "الحالة غير موجودة" }, 404);
    if (!(await allowToday("report", 2000))) return json({ error: "تعذر استلام البلاغ الآن، حاول لاحقًا." }, 429);
    c.userReports = (c.userReports || 0) + 1;
    c.lastReportAt = new Date().toISOString();
    if (c.status === "جديد") c.status = "قيد المراجعة";
    await saveCase(c);
    return json({ ok: true, case: c });
  } catch (e) { return fail(e); }
}
