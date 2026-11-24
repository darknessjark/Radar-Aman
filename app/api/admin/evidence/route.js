// Evidence pack. GET ?id= → bundle + screenshots (officers and judges). POST {id} → capture now (officers only).
import { getCase, saveCase, listCases, redis } from "@/lib/db";
import { linkedTo } from "@/lib/networks";
import { bundle, captureLink, caseLinks } from "@/lib/evidence";
import { allowToday } from "@/lib/db";
import { json, fail, isAdmin, canWrite, readOnly, role } from "../../_util";
export const runtime = "nodejs";
export const maxDuration = 300;

async function view(c, req) {
  const all = await listCases(300);
  const linked = linkedTo(c, all).map(l => l.o.id);
  const keys = (c.evidence || []).map(e => e.screenshot?.key).filter(Boolean);
  const imgs = {};
  if (keys.length) {
    const vals = await redis().mget(...keys);
    keys.forEach((k, i) => { if (vals[i]) imgs[k] = vals[i]; });
  }
  return { bundle: bundle(c, linked), images: imgs, thumbs: c.thumbs || [], role: role(req) };
}

export async function GET(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try {
    const c = await getCase(new URL(req.url).searchParams.get("id"));
    if (!c) return json({ error: "الحالة غير موجودة" }, 404);
    return json(await view(c, req));
  } catch (e) { return fail(e); }
}

export async function POST(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  if (!canWrite(req)) return readOnly();
  try {
    const { id, url } = await req.json();
    const c = await getCase(id);
    if (!c) return json({ error: "الحالة غير موجودة" }, 404);
    const links = url ? [String(url).slice(0, 500)] : caseLinks(c);
    if (!links.length) return json({ error: "لا يوجد رابط موقع في هذه الحالة لالتقاطه. (روابط منصات التواصل تُوثّق بلقطة الشاشة المرفقة.)" }, 400);
    if (!(await allowToday("evidence", +process.env.DAILY_EVIDENCE_LIMIT || 30))) return json({ error: "تم الوصول للحد اليومي لالتقاط الأدلة." }, 429);
    const start = (c.evidence || []).length;
    const recs = await Promise.all(links.map((u, i) => captureLink(c.id, u, start + i)));
    c.evidence = [...(c.evidence || []), ...recs].slice(-20);
    await saveCase(c);
    return json(await view(c, req));
  } catch (e) { return fail(e); }
}
