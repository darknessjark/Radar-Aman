import { redis } from "./db";
import Anthropic from "@anthropic-ai/sdk";
import { MODEL, parseJSON } from "./ai";


export const POST_MIN = +process.env.POST_MIN_SCORE || 65;
export const finalScore = c => (c.deep?.status === "done" && typeof c.deep.score_after === "number" ? c.deep.score_after : c.result?.risk_score ?? 0);

// Removes anything that could identify a person or account: phones, IBANs, @handles, links, emails.
export function scrub(s) {
  return String(s || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b[\w.-]+\.(com|ae|net|org|io|co|me|top|xyz|shop|online|site|info|store|live)\b\S*/gi, "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "")
    .replace(/@[\w.]{3,}/g, "")
    .replace(/AE\d{2}[\d\s]{10,}/gi, "")
    .replace(/\+?\d[\d\s\-()]{6,}\d/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function draftPost(c) {
  const r = c.result || {};
  const prompt = `أنت تكتب منشور توعية على إنستقرام لحساب "رادار أمان"، يحذّر الجمهور في الإمارات من نمط احتيال رُصد للتو.

معلومات الحالة (للاستخدام الداخلي فقط):
- المنصة: ${c.platform}
- نوع الاحتيال: ${r.scam_type || ""}
- الملخص: ${c.deep?.summary || r.summary || ""}
- الأساليب: ${(r.tactics || []).join("، ")}
- مؤشرات الخطورة: ${(r.red_flags || []).map(f => f.title).join("، ")}
- السعر المعلن مقابل السوق: ${r.price_analysis?.advertised || "-"} / ${r.price_analysis?.market_estimate || "-"}

${c.hasImage ? "ملاحظة: سيُنشر المنشور مع لقطة الشاشة الأصلية للإعلان بعد إخفاء البيانات الخاصة، فاكتب بحيث يصلح التحذير مع الصورة (مثل: \"كما في الصورة\") بدون وصف تفاصيل خاصة بها.\n" : ""}قواعد صارمة:
- ممنوع تمامًا ذكر أي اسم حساب أو اسم شخص أو شركة أو رقم هاتف أو رقم حساب بنكي أو رابط أو بريد. المنشور عن النمط فقط.
- لا تتهم أحدًا بعينه. استخدم صيغة "انتشرت إعلانات..." أو "رصدنا إعلانات...".
- أسلوب رسمي هادئ وواضح، بدون تهويل وبدون إيموجي كثير (إيموجي واحد على الأكثر).
- headline: عنوان قصير جدًا (من 3 إلى 7 كلمات) يوضع على الصورة.
- points: ثلاث علامات تحذير قصيرة (كل واحدة 4 إلى 9 كلمات) تساعد الناس يكتشفون هذا النمط.
- caption: نص المنشور بالعربية (من 60 إلى 120 كلمة): ماذا رُصد، كيف تتعرف عليه، ماذا تفعل (لا تحوّل قبل المعاينة، تحقق من القنوات الرسمية، أبلغ عن الإعلان داخل المنصة). ثم سطر إنجليزي واحد قصير يلخص التحذير. ثم 4 إلى 6 وسوم مثل #رادار_أمان #احذر_الاحتيال #الإمارات.

أعد JSON فقط:
{"headline":"...","points":["...","...","..."],"caption":"..."}`;
  const msg = await new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages.create({
    model: MODEL, max_tokens: 1500, messages: [{ role: "user", content: prompt }]
  });
  const d = parseJSON((msg.content || []).filter(b => b.type === "text").map(b => b.text).join("\n"));
  return {
    headline: scrub(d.headline).slice(0, 80),
    points: (d.points || []).slice(0, 3).map(p => scrub(p).slice(0, 90)),
    caption: scrub(d.caption).slice(0, 2000),
    scamType: scrub(r.scam_type && r.scam_type !== "لا يوجد" ? r.scam_type : "").slice(0, 60)
  };
}

// Finds the parts of a screenshot that identify a person, account or contact so they can be covered before posting.
// Boxes are fractions (0 to 1) of the image width and height.
export async function detectSensitive(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl || "");
  if (!m) return [];
  const prompt = `هذه لقطة شاشة لإعلان أو رسالة مشتبه بها، وسننشرها للتوعية بعد إخفاء كل ما يدل على أشخاص أو حسابات.
حدّد كل منطقة تحتاج إخفاءً:
- أسماء الحسابات والصفحات والمتاجر والأشخاص ومعرّفات @ والصور الشخصية (الأفاتار) وشعارات الحسابات
- وجوه الأشخاص
- أرقام الهاتف والواتساب والبريد وآيبان وأرقام الحسابات البنكية
- الروابط وأسماء النطاقات ورموز QR
- العناوين التفصيلية
لا تخفِ نص العرض نفسه (الوصف، السعر، الشروط، الوعود) ولا واجهة التطبيق العامة.
أعد JSON فقط: {"boxes":[{"x":0-1000,"y":0-1000,"w":0-1000,"h":0-1000,"what":"وصف قصير"}]}
الإحداثيات نسبة من عرض الصورة وارتفاعها (من 0 إلى 1000)، حيث (x,y) الزاوية العلوية اليسرى. اجعل كل صندوق يغطي النص كاملًا مع هامش بسيط. إن لم يوجد شيء فأعد boxes فارغة.`;
  const msg = await new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages.create({
    model: MODEL, max_tokens: 2000,
    messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } }, { type: "text", text: prompt }] }]
  });
  const d = parseJSON((msg.content || []).filter(b => b.type === "text").map(b => b.text).join("\n"));
  return cleanBoxes((d.boxes || []).map(b => ({ x: b.x / 1000, y: b.y / 1000, w: b.w / 1000, h: b.h / 1000 })), 0.012);
}

export function cleanBoxes(list, pad = 0) {
  return (Array.isArray(list) ? list : []).slice(0, 40).map(b => {
    let x = +b.x, y = +b.y, w = +b.w, h = +b.h;
    if (![x, y, w, h].every(Number.isFinite)) return null;
    x -= pad; y -= pad; w += pad * 2; h += pad * 2;
    x = Math.max(0, Math.min(1, x)); y = Math.max(0, Math.min(1, y));
    w = Math.min(w, 1 - x); h = Math.min(h, 1 - y);
    return w > 0.005 && h > 0.005 ? { x: +x.toFixed(4), y: +y.toFixed(4), w: +w.toFixed(4), h: +h.toFixed(4) } : null;
  }).filter(Boolean);
}

export const igConnected = () => !!process.env.IG_ACCESS_TOKEN;
const IGV = () => process.env.IG_GRAPH_VERSION || "v25.0";
// "Unified login" (Facebook Login for Business) tokens never expire and go through graph.facebook.com;
// they need IG_USER_ID. Classic Instagram-login tokens go through graph.instagram.com and are renewed.
const unified = () => !!process.env.IG_USER_ID && process.env.IG_MODE !== "instagram";

// Long-lived tokens last 60 days. Keep the newest one in the database and renew it every ~20 days.
async function igToken() {
  if (unified()) return process.env.IG_ACCESS_TOKEN;
  const db = redis();
  let rec = await db.get("ig:token");
  if (!rec || !rec.token) rec = { token: process.env.IG_ACCESS_TOKEN, at: 0 };
  if (Date.now() - (rec.at || 0) > 20 * 864e5) {
    try {
      const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(rec.token)}`);
      const j = await r.json();
      if (j.access_token) { rec = { token: j.access_token, at: Date.now() }; await db.set("ig:token", rec); }
    } catch {}
  }
  return rec.token;
}
async function igUserId(token) {
  if (process.env.IG_USER_ID) return process.env.IG_USER_ID;
  const r = await fetch(`https://graph.instagram.com/${IGV()}/me?fields=user_id,username`, { headers: { authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("IG: " + (j.error?.message || r.status));
  return j.user_id || j.id;
}

export async function publishToInstagram(imageUrl, caption) {
  const v = IGV(), host = unified() ? "graph.facebook.com" : "graph.instagram.com";
  const token = await igToken();
  const base = `https://${host}/${v}/${await igUserId(token)}`;
  const auth = { "content-type": "application/json", authorization: `Bearer ${token}` };
  const call = async (url, body) => {
    const r = await fetch(url, body ? { method: "POST", headers: auth, body: JSON.stringify(body) } : { headers: auth });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error("IG: " + (j.error?.message || r.status));
    return j;
  };
  const created = await call(`${base}/media`, { image_url: imageUrl, caption });
  for (let i = 0; i < 10; i++) {
    const s = await call(`https://${host}/${v}/${created.id}?fields=status_code`);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("IG: container " + s.status_code);
    await new Promise(r => setTimeout(r, 2000));
  }
  const pub = await call(`${base}/media_publish`, { creation_id: created.id });
  let permalink = null;
  try { permalink = (await call(`https://${host}/${v}/${pub.id}?fields=permalink`)).permalink; } catch {}
  return { mediaId: pub.id, permalink };
}
