import { getCase, saveCase, redis } from "@/lib/db";
import { draftPost, igConnected, publishToInstagram, scrub, finalScore, POST_MIN, detectSensitive, cleanBoxes } from "@/lib/post";
import { json, fail, isAdmin } from "../../_util";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  const img = new URL(req.url).searchParams.get("img");
  if (img) {
    if (!/^[a-z0-9]{6,40}$/i.test(img)) return json({ error: "غير موجود" }, 404);
    const b64 = await redis().get(`caseimg:${img}`);
    return b64 ? json({ image: "data:image/jpeg;base64," + b64 }) : json({ error: "لا توجد صورة محفوظة لهذه الحالة." }, 404);
  }
  return json({ igConnected: igConnected(), min: POST_MIN });
}

export async function POST(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try {
    const body = await req.json();
    const body_reviewed = body.reviewed === true;
    const { id, action, caption, headline, points, image, boxes, mode, detected } = body;
    const c = await getCase(id);
    if (!c) return json({ error: "الحالة غير موجودة" }, 404);

    if (action === "draft") {
      if (finalScore(c) < POST_MIN) return json({ error: `المنشورات للحالات ${POST_MIN}٪ فأكثر فقط.` }, 400);
      c.post = { status: "draft", createdAt: new Date().toISOString(), ...(await draftPost(c)) };
      await saveCase(c); return json({ case: c });
    }
    if (action === "image") {
      if (!/^data:image\/jpeg;base64,/.test(image || "") || image.length > 1_200_000) return json({ error: "الصورة غير صالحة أو كبيرة." }, 400);
      await redis().set(`caseimg:${c.id}`, image.split(",")[1], { ex: 60 * 60 * 24 * 30 });
      c.hasImage = true;
      if (c.post) { c.post.boxes = []; c.post.detected = false; c.post.mode = "shot"; }
      await saveCase(c); return json({ case: c });
    }
    if (action === "detect") {
      const b64 = await redis().get(`caseimg:${c.id}`);
      if (!b64) return json({ error: "لا توجد صورة محفوظة لهذه الحالة." }, 404);
      const found = await detectSensitive("data:image/jpeg;base64," + b64);
      return json({ boxes: found });
    }
    if (!c.post) return json({ error: "جهّز المنشور أولًا." }, 400);

    if (action === "save") {
      if (typeof caption === "string") c.post.caption = scrub(caption).slice(0, 2000);
      if (typeof headline === "string") c.post.headline = scrub(headline).slice(0, 80);
      if (Array.isArray(points)) c.post.points = points.slice(0, 3).map(p => scrub(p).slice(0, 90));
      if (Array.isArray(boxes)) c.post.boxes = cleanBoxes(boxes);
      if (mode === "shot" || mode === "text") c.post.mode = mode === "shot" && c.hasImage ? "shot" : "text";
      if (typeof detected === "boolean") c.post.detected = detected;
      await saveCase(c); return json({ case: c });
    }
    if (action === "reject") {
      c.post.status = "rejected"; await saveCase(c); return json({ case: c });
    }
    if (action === "approve") {
      if (typeof caption === "string") c.post.caption = scrub(caption).slice(0, 2000);
      if (c.post.mode === "shot" && !body_reviewed) return json({ error: "أكّد أولًا أنك راجعت الصورة وأن البيانات الخاصة مخفية." }, 400);
      if (!/^data:image\/jpeg;base64,/.test(image || "") || image.length > 4_000_000) return json({ error: "صورة المنشور غير صالحة." }, 400);
      await redis().set(`postimg:${c.id}`, image.split(",")[1], { ex: 60 * 60 * 24 * 30 });
      const origin = new URL(req.url).origin;
      const imageUrl = `${origin}/api/post-image?id=${c.id}&v=${Date.now()}`;
      c.post.imageUrl = imageUrl;
      c.post.approvedAt = new Date().toISOString();
      if (!igConnected()) {
        c.post.status = "approved";
        await saveCase(c);
        return json({ case: c, published: false });
      }
      const r = await publishToInstagram(imageUrl, c.post.caption);
      c.post.status = "published"; c.post.publishedAt = new Date().toISOString(); c.post.permalink = r.permalink; c.post.mediaId = r.mediaId;
      await saveCase(c);
      return json({ case: c, published: true });
    }
    return json({ error: "إجراء غير معروف" }, 400);
  } catch (e) {
    const m = String(e?.message || e);
    if (m.startsWith("IG:")) return json({ error: "رفض إنستقرام النشر: " + m.slice(3).trim() }, 502);
    return fail(e);
  }
}
