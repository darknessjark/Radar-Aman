import { getCase, saveCase, redis } from "@/lib/db";
import { draftPost, igConnected, publishToInstagram, scrub, finalScore, POST_MIN } from "@/lib/post";
import { json, fail, isAdmin } from "../../_util";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  return json({ igConnected: igConnected(), min: POST_MIN });
}

export async function POST(req) {
  if (!isAdmin(req)) return json({ error: "كلمة السر غير صحيحة" }, 401);
  try {
    const { id, action, caption, headline, points, image } = await req.json();
    const c = await getCase(id);
    if (!c) return json({ error: "الحالة غير موجودة" }, 404);

    if (action === "draft") {
      if (finalScore(c) < POST_MIN) return json({ error: `المنشورات للحالات ${POST_MIN}٪ فأكثر فقط.` }, 400);
      c.post = { status: "draft", createdAt: new Date().toISOString(), ...(await draftPost(c)) };
      await saveCase(c); return json({ case: c });
    }
    if (!c.post) return json({ error: "جهّز المنشور أولًا." }, 400);

    if (action === "save") {
      if (typeof caption === "string") c.post.caption = scrub(caption).slice(0, 2000);
      if (typeof headline === "string") c.post.headline = scrub(headline).slice(0, 80);
      if (Array.isArray(points)) c.post.points = points.slice(0, 3).map(p => scrub(p).slice(0, 90));
      await saveCase(c); return json({ case: c });
    }
    if (action === "reject") {
      c.post.status = "rejected"; await saveCase(c); return json({ case: c });
    }
    if (action === "approve") {
      if (typeof caption === "string") c.post.caption = scrub(caption).slice(0, 2000);
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
