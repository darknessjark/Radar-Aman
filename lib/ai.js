import Anthropic from "@anthropic-ai/sdk";
import { linkCheck, domainsFrom } from "./linkcheck";

export const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const client = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export function parseJSON(t) {
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("NO_JSON");
  return JSON.parse(t.slice(s, e + 1));
}
const textOf = msg => (msg.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");

function imageBlocks(dataUrls) {
  return (dataUrls || []).slice(0, 3).map(u => {
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(u || "");
    return m ? { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } } : null;
  }).filter(Boolean);
}

const PATTERNS = `أنماط الاحتيال الشائعة في الإمارات (من تحذيرات الشرطة): تأشيرات وإقامات وهمية، استقدام عمالة منزلية وهمي، تأمين غير معتمد، سيارات "مصادرة من الجمارك" بأسعار غير واقعية، تأجير شاليهات وعِزب وهمية، رسوم شحن أو تتبع طرود وهمية، استثمار وتداول بأرباح مضمونة، عقارات وهمية، مواقع تنتحل جهات حكومية (حماية المستهلك، الشرطة، المخالفات، الهوية الرقمية)، عروض عمل وهمية، طلب بيانات بطاقة أو رمز OTP.`;

const LANG_RULE = {
  ar: "- اكتب كل النصوص بالعربية الفصحى المبسطة.",
  en: "- Write every free-text field in clear, plain English. Keep verdict, confidence and the scam_type value 'لا يوجد' exactly as the Arabic values listed in the format below. Write the tactics list in English."
};
export async function quickScan({ platform, sourceUrl, text, images, lang = "ar" }) {
  const links = linkCheck(domainsFrom(sourceUrl, text));
  const prompt = `أنت محلل احتيال إلكتروني يعمل لصالح جهة شرطية في دولة الإمارات. مهمتك تقييم إعلان أو رسالة منشورة على الإنترنت وتحديد احتمال أنها احتيال.

${PATTERNS}

مؤشرات الخطورة: سعر أقل من السوق بشكل غير منطقي، استعجال وكمية محدودة، طلب عربون أو تحويل قبل المعاينة، التواصل عبر واتساب فقط أو "الرقم في البايو"، طلب بيانات بطاقة أو كلمات مرور، رابط أو اسم نطاق يشبه جهة رسمية لكنه ليس نطاقها الرسمي، حساب جديد أو بلا تفاعل حقيقي، انتحال شعار أو اسم جهة.
مؤشرات الأمان: معاينة متاحة، جهة مرخصة يمكن التحقق منها، دفع عبر قنوات رسمية، سعر منطقي، لا ضغط زمني.

قواعد:
- احكم فقط بناءً على ما في الإعلان والصور. لا تخترع معلومات.
- لا تجزم بأن مكانًا أو منتجًا "غير موجود" في الإمارات؛ إن شككت قل إنه يحتاج تحققًا.
- إذا كانت المعلومات غير كافية فاجعل الدرجة متوسطة واذكر ذلك.
- استخرج الكيانات كما وردت حرفيًا (الأرقام، الآيبان، النطاقات، معرّفات الحسابات).
${LANG_RULE[lang] || LANG_RULE.ar}

المنصة: ${platform}
الرابط: ${sourceUrl || "غير متوفر"}
عدد لقطات الشاشة المرفقة: ${(images || []).length}
نتائج الفحص الآلي للروابط: ${links.length ? links.map(l => l.domain + ": " + l.flags.map(f => f.t).join("؛ ")).join(" | ") : "لا روابط في النص"}
نص الإعلان:
"""
${text || "(لا يوجد نص — اعتمد على الصور)"}
"""

أعد JSON فقط بهذا الشكل، بدون أي نص قبله أو بعده:
{
 "risk_score": عدد صحيح من 0 إلى 100,
 "verdict": "احتيال مرجّح" أو "مشبوه" أو "منخفض الخطورة",
 "scam_type": "نوع الاحتيال باختصار، أو 'لا يوجد'",
 "summary": "جملة أو جملتان تلخص الحكم",
 "reasons": ["من 2 إلى 4 أسباب للحكم، كل سبب جملة قصيرة جدًا بلغة يومية بسيطة يفهمها أي شخص، بدون مصطلحات (مثال: السعر أرخص بكثير من السوق)"],
 "red_flags": [{"title":"عنوان قصير","detail":"الدليل من الإعلان"}],
 "positive_signals": ["مؤشر أمان إن وجد"],
 "entities": {"phones":[], "ibans":[], "domains":[], "urls":[], "accounts":[], "emails":[]},
 "price_analysis": {"advertised":"السعر المعلن أو null","market_estimate":"تقديرك للسعر المعتاد في الإمارات كنطاق، أو null","gap_percent": رقم 0-100 أو null,"note":"جملة تشرح المقارنة"},
 "tactics": ["ما ينطبق فقط من: سعر غير واقعي، استعجال وضغط زمني، عربون قبل المعاينة، تواصل خارج المنصة، انتحال جهة رسمية، طلب بيانات بنكية أو بطاقة، أرباح مضمونة، صور مسروقة محتملة، حساب حديث أو ضعيف التفاعل، رابط مشبوه"],
 "account_analysis": "ما يظهر عن الحساب في الصور (الاسم، المعرّف، المتابعين، التفاعل) أو null",
 "image_analysis": "ماذا تُظهر الصور وهل تتطابق مع المكان أو المنتج المدّعى، أو null",
 "impersonated_entity": "الجهة المنتحلة أو null",
 "officer_action": "الإجراء المقترح للمراجع في جملة (مثل الإبلاغ للمنصة مع الأدلة، توثيق الحساب والرقم)",
 "citizen_advice": "نصيحة قصيرة للشخص الذي شاهد الإعلان",
 "confidence": "عالية" أو "متوسطة" أو "منخفضة"
}`;

  let result;
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await client().messages.create({
      model: MODEL,
      max_tokens: 6000,
      messages: [{ role: "user", content: [...imageBlocks(images), { type: "text", text: prompt }] }]
    });
    try { result = parseJSON(textOf(msg)); break; }
    catch (e) { if (attempt === 1) throw e; }
  }
  result.risk_score = Math.max(0, Math.min(100, Math.round(+result.risk_score || 0)));
  const aiDomains = [...(result.entities?.domains || []), ...(result.entities?.urls || [])];
  result.link_check = linkCheck([...links.map(l => l.domain), ...aiDomains]);
  return result;
}

export async function deepCheck(c) {
  const r = c.result || {};
  const prompt = `أنت محقق احتيال إلكتروني تعمل لصالح جهة شرطية في الإمارات. أمامك حالة فحصها نظام آلي فحصًا أوليًا، ومهمتك الآن "فحص معمّق": استخدم البحث في الإنترنت للتحقق من الأدلة، ثم أعد تقييم الخطورة.

بيانات الحالة:
- المنصة: ${c.platform}
- الرابط: ${c.sourceUrl || "غير متوفر"}
- نص الإعلان: ${c.text || "(غير متوفر — كان في صورة)"}
- ملخص الفحص الأولي: ${r.summary || ""}
- نوع الاحتيال المرجّح: ${r.scam_type || ""}
- السعر المعلن: ${r.price_analysis?.advertised || r.advertised_price || "غير محدد"}
- الكيانات المستخرجة: ${JSON.stringify(r.entities || {})}
- تحليل الحساب الأولي: ${r.account_analysis || ""}
- تحليل الصورة الأولي: ${r.image_analysis || ""}
- درجة الخطورة الأولية: ${r.risk_score}

ابحث (بالعربية والإنجليزية) عن:
1. الحساب: معرّف الحساب واسمه على المنصة وفي قوقل، وهل يظهر بإعلانات أو شكاوى أخرى.
2. أرقام الهواتف والآيبان: هل تظهر في إعلانات أخرى أو تحذيرات أو شكاوى.
3. السعر: ما السعر الحقيقي في الإمارات لنفس المنتج أو الخدمة أو المكان، مع مصدر.
4. المكان أو الجهة المذكورة: هل هي موجودة فعلًا، وما قنواتها الرسمية للحجز أو البيع، وهل الحساب المعلِن تابع لها.
5. تكرار نص العرض نفسه في صفحات أخرى أو شكاوى من أسلوب مشابه.
6. أي نطاق موقع مذكور: سمعته وتحذيرات حوله.

قواعد صارمة:
- اعتمد فقط على ما تجده في نتائج البحث. لا تخترع أرقامًا أو أسماء أو تواريخ.
- إذا لم تجد شيئًا عن نقطة ما فقل ذلك صراحة (مستوى "none").
- إذا وجدت أن الفحص الأولي أخطأ في نقطة فصحّحها بوضوح.
${c.lang === 'en' ? "- Write the summary, titles and details in clear, plain English. Keep each finding's 'area' exactly as one of the Arabic words listed in the format below, and 'level' as listed." : '- اكتب بالعربية الفصحى المبسطة.'}

بعد انتهاء البحث أعد JSON فقط بهذا الشكل:
{
 "score_after": عدد صحيح 0-100,
 "summary": "ملخص من جملتين أو ثلاث بما تغيّر بعد الفحص",
 "findings": [{"area":"الحساب" أو "الرابط" أو "الصورة" أو "السعر" أو "إعلانات أخرى" أو "شكاوى","level":"red" أو "amber" أو "green" أو "none","title":"عنوان قصير","detail":"الدليل مع ذكر المصدر باختصار"}],
 "sources": ["روابط المصادر التي اعتمدت عليها"]
}`;

  const content = [];
  if ((c.thumbs || [])[0]) content.push(...imageBlocks([c.thumbs[0]]));
  content.push({ type: "text", text: prompt });
  const messages = [{ role: "user", content }];
  const tools = [{
    type: "web_search_20250305", name: "web_search", max_uses: 8
  }];

  let msg, urls = new Set(), allText = [];
  for (let i = 0; i < 6; i++) {
    msg = await client().messages.create({ model: MODEL, max_tokens: 8000, tools, messages });
    (msg.content || []).forEach(b => {
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) b.content.forEach(x => x.url && urls.add(x.url));
      if (b.type === "text") { allText.push(b.text); if (Array.isArray(b.citations)) b.citations.forEach(x => x.url && urls.add(x.url)); }
    });
    if (msg.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: msg.content });
  }
  let d;
  try { d = parseJSON(textOf(msg)); }
  catch {
    // Search notes may surround the JSON or the answer may be cut off: ask for a clean JSON from the gathered notes.
    const notes = allText.join("\n").slice(0, 20000);
    const fix = await client().messages.create({
      model: MODEL, max_tokens: 4000,
      messages: [{ role: "user", content: `حوّل ملاحظات الفحص المعمّق التالية إلى JSON فقط (بدون أي نص قبله أو بعده) بهذا الشكل:\n{"score_after": 0-100, "summary": "...", "findings": [{"area":"الحساب|الرابط|الصورة|السعر|إعلانات أخرى|شكاوى","level":"red|amber|green|none","title":"...","detail":"..."}], "sources": []}\nدرجة الخطورة الأولية: ${r.risk_score}. لا تخترع معلومات غير موجودة في الملاحظات.\n\nالملاحظات:\n${notes}` }]
    });
    d = parseJSON(textOf(fix));
  }
  d.score_after = Math.max(0, Math.min(100, Math.round(+d.score_after || 0)));
  const src = (d.sources || []).filter(u => /^https?:\/\//.test(u));
  d.sources = [...new Set(src.length ? src : [...urls])].slice(0, 8);
  return d;
}
