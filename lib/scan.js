import crypto from "crypto";
import { quickScan } from "./ai";
import { saveCase, listCases, allowToday, redis } from "./db";
import { linkedTo } from "./networks";

export const newId = () => crypto.randomBytes(9).toString("hex");

export async function runScan(body, source = "عام") {
  const lang = body.lang === "en" ? "en" : "ar";
  const platform = String(body.platform || "أخرى").slice(0, 40);
  const sourceUrl = String(body.sourceUrl || "").slice(0, 500);
  const text = String(body.text || "").slice(0, 5000);
  const images = (Array.isArray(body.images) ? body.images : []).filter(x => typeof x === "string" && x.length < 3_000_000).slice(0, 3);
  const thumbs = (Array.isArray(body.thumbs) ? body.thumbs : []).filter(x => typeof x === "string" && x.length < 120_000).slice(0, 3);
  const phash = (Array.isArray(body.phash) ? body.phash : []).filter(x => /^[01]{64}$/.test(x)).slice(0, 3);
  if (!text && !images.length && !sourceUrl) return { error: "أدخل نص الإعلان أو ارفع لقطة شاشة.", status: 400 };

  const limit = +process.env.DAILY_SCAN_LIMIT || 150;
  if (!(await allowToday("scan", limit))) return { error: "تم الوصول للحد اليومي للفحوصات. حاول غدًا.", status: 429 };

  const result = await quickScan({ platform, sourceUrl, text, images, lang });
  const hash = crypto.createHash("sha256").update(text + "|" + sourceUrl + "|" + images.join("")).digest("hex");
  const postImg = typeof body.postImg === "string" && /^data:image\/jpeg;base64,/.test(body.postImg) && body.postImg.length < 1_000_000 ? body.postImg : "";
  const c = { id: newId(), createdAt: new Date().toISOString(), platform, sourceUrl, text, thumbs, phash, result, hash, status: "جديد", source, lang };
  // Keep one post-size copy of the first screenshot so the officer can turn the case into a warning post (admin only).
  if (postImg) { try { await redis().set(`caseimg:${c.id}`, postImg.split(",")[1], { ex: 60 * 60 * 24 * 30 }); c.hasImage = true; } catch {} }
  await saveCase(c);
  const all = await listCases(300);
  const links = linkedTo(c, all).map(l => ({ id: l.o.id, shared: l.shared, platform: l.o.platform, score: l.o.result?.risk_score ?? null }));
  return { case: c, links };
}
