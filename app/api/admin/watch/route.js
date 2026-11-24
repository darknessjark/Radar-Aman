import { redis } from "@/lib/db";
import { json, fail, isAdmin, canWrite, readOnly } from "../../_util";
export const runtime = "nodejs";
export const DEFAULT_KEYWORDS = ["شاليه للإيجار", "فيلا للإيجار", "مزرعة للإيجار", "تأشيرة زيارة", "استقدام خادمات", "سيارات مصادرة", "مزاد سيارات", "وظائف شاغرة", "استثمار مضمون", "تداول أرباح", "تأمين سيارات", "iPhone sale UAE", "visa UAE", "job offer Dubai"];
export async function GET(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try { const k = await redis().get("watch:keywords"); return json({ keywords: Array.isArray(k) && k.length ? k : DEFAULT_KEYWORDS }); } catch (e) { return fail(e); }
}
export async function POST(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  if (!canWrite(req)) return readOnly();
  try {
    const { keywords } = await req.json();
    const k = [...new Set((keywords || []).map(x => String(x).trim().slice(0, 60)).filter(Boolean))].slice(0, 60);
    await redis().set("watch:keywords", k);
    return json({ keywords: k });
  } catch (e) { return fail(e); }
}
