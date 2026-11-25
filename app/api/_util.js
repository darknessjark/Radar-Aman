import { NextResponse } from "next/server";
import crypto from "crypto";
import { readSession, COOKIE } from "@/lib/session";
import { roleFor } from "@/lib/uaepass";
export const json = (data, status = 200) => NextResponse.json(data, { status });
export function fail(e) {
  const m = String(e?.message || e);
  if (m === "NO_DB") return json({ error: "قاعدة البيانات غير مربوطة. أضف Upstash Redis من تبويب Storage في Vercel ثم أعد النشر." }, 500);
  if (/api[_ -]?key|authentication|401/i.test(m)) return json({ error: "مفتاح Anthropic API غير صحيح أو غير مضاف في Vercel." }, 500);
  if (/credit|balance|billing/i.test(m)) return json({ error: "رصيد حساب Anthropic API انتهى. أضف رصيدًا من Billing." }, 500);
  if (/overloaded|529|rate.?limit|429/i.test(m)) return json({ error: "الخدمة مشغولة حاليًا، أعد المحاولة بعد لحظات." }, 503);
  if (/NO_JSON|JSON|Unexpected token/i.test(m)) return json({ error: "تعذّر تنسيق نتيجة التحليل، أعد المحاولة." }, 500);
  if (/model|not_found|404/i.test(m)) return json({ error: "اسم النموذج غير متاح لهذا الحساب (تحقق من CLAUDE_MODEL)." }, 500);
  console.error(e);
  return json({ error: "حدث خطأ أثناء التحليل، أعد المحاولة.", code: m.slice(0, 120) }, 500);
}
// Constant-time comparison for passwords and keys.
export const safeEq = (a, b) => { const x = crypto.createHash("sha256").update(String(a)).digest(), y = crypto.createHash("sha256").update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };
// Officer access: "admin" can change things; "judge" (JUDGE_PASSWORD) can see everything but change nothing.
// Either a password header, or a signed session cookie from UAE PASS sign-in.
export function role(req) {
  const given = req.headers.get("x-admin-password");
  const admin = process.env.ADMIN_PASSWORD, judge = process.env.JUDGE_PASSWORD;
  if (given && given !== "null") {
    if (admin && safeEq(given, admin)) return "admin";
    if (judge && safeEq(given, judge)) return "judge";
  }
  const s = readSession(req.cookies?.get?.(COOKIE)?.value);
  if (!s || !s.sub) return null;
  // The allow-list is checked again on every request, so removing someone takes effect at once.
  return roleFor({ uuid: s.sub, userType: s.userType, email: s.email, mobile: s.mobile, idn: s.idn });
}
export const isAdmin = req => !!role(req);
export const canWrite = req => role(req) === "admin";
export const readOnly = () => json({ error: "حساب العرض للقراءة فقط: لا يمكن الحفظ أو الحذف أو النشر. | View-only access: saving, deleting and publishing are disabled." }, 403);
