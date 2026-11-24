// All interface text, Arabic first, English second.
export const D = {
  app: ["رادار أمان", "Radar Aman"],
  proto: ["نموذج أولي", "Prototype"],
  switchTo: ["English", "العربية"],
  officer: ["لوحة الضابط", "Officer dashboard"],
  viewOnly: ["وضع العرض للحكام: تشاهد كل شيء، والحفظ والحذف والنشر معطّلة.", "Judge view: you can see everything; saving, deleting and publishing are turned off."],
  back: ["العودة لصفحة الفحص", "Back to the checker"],

  heroTitle: ["افحص قبل ما تدفع.", "Check it before you pay."],
  heroSub: ["ارفع لقطة شاشة لإعلان أو رسالة أو موقع. رادار أمان يقرأها، ويتحقق من الحساب والسعر والروابط، ثم يعطيك تقديرًا لاحتمال أنها احتيال.", "Upload a screenshot of an ad, message or website. Radar Aman reads it, checks the account, the price and the links, and tells you how likely it is to be a scam."],
  chkAccount: ["الحساب", "The account"], chkAccountD: ["من يقف خلف الإعلان وهل ظهر في بلاغات", "Who is behind the ad, and whether it has been reported"],
  chkPrice: ["السعر", "The price"], chkPriceD: ["مقارنته بالسعر المعتاد في الإمارات", "Compared with what this normally costs in the UAE"],
  chkLinks: ["الروابط", "The links"], chkLinksD: ["هل تنتحل جهة رسمية أو بنكًا", "Whether they imitate an official body or a bank"],
  chkRepeat: ["التكرار", "Repeats"], chkRepeatD: ["هل الرقم أو الصورة نفسها في إعلانات أخرى", "Whether the same number or image appears in other ads"],

  platform: ["المنصة", "Platform"],
  urlSocial: ["رابط الإعلان أو الحساب (اختياري)", "Ad or account link (optional)"],
  urlMsg: ["رابط موجود في الرسالة (اختياري)", "Link inside the message (optional)"],
  urlWeb: ["رابط الموقع", "Website link"],
  shotsSocial: ["لقطات شاشة للإعلان وصفحة الحساب (حتى 3)", "Screenshots of the ad and the account page (up to 3)"],
  shotsMsg: ["لقطة شاشة للرسالة (اختياري)", "Screenshot of the message (optional)"],
  shotsWeb: ["لقطة شاشة للموقع (اختياري)", "Screenshot of the website (optional)"],
  dropIdle: ["اضغط لاختيار الصور، أو اسحبها إلى هنا", "Choose images, or drag them here"],
  dropCount: ["{n} صورة مرفقة — اضغط لإضافة المزيد", "{n} attached — add more"],
  tipSocial: ["ارفع لقطة الإعلان ولقطة صفحة الحساب (البايو وعدد المتابعين). في إنستقرام أضف لقطة «حول هذا الحساب» لمعرفة عمر الحساب.", "Add the ad and the account page (bio and follower count). On Instagram, add the About this account screen to show the account age."],
  msgText: ["نص الرسالة", "Message text"], extraText: ["نص إضافي (اختياري)", "Extra text (optional)"],
  msgPh: ["الصق نص الرسالة كما وصلتك", "Paste the message as you received it"], extraPh: ["أي نص غير ظاهر في الصور", "Any text that is not visible in the images"],
  addText: ["إضافة نص", "Add text"],
  scan: ["افحص", "Run check"], scanning: ["جاري التحليل", "Analysing"], clear: ["مسح", "Clear"],
  eMsg: ["الصق نص الرسالة أو ارفع لقطة شاشة لها.", "Paste the message text or add a screenshot of it."],
  eWeb: ["أدخل رابط الموقع.", "Enter the website link."], eSocial: ["ارفع لقطة شاشة للإعلان.", "Add a screenshot of the ad."],
  eMax: ["الحد الأقصى 3 صور", "Maximum 3 images"], eNotImg: ["الملف ليس صورة", "That file is not an image"], eRead: ["تعذر قراءة الصورة. جرّب PNG أو JPG", "Could not read the image. Try PNG or JPG"],
  eGeneric: ["تعذر التحليل", "The check could not be completed"], eConn: ["رد غير متوقع من الخادم", "Unexpected response from the server"],
  eDeep: ["تعذر الفحص المعمّق", "The deep check could not be completed"], eDeepConn: ["انقطع الاتصال أثناء الفحص المعمّق", "Connection lost during the deep check"],
  disclaimer: ["نموذج أولي. النتائج استرشادية ولا تغني عن التحقق الرسمي.", "Prototype. Results are guidance only and do not replace official verification."],
  ifPaid: ["إذا دفعت مبلغًا: تواصل مع بنكك فورًا، ثم خدمة أمان 8002626.", "If you already paid: contact your bank straight away, then the Aman service on 8002626."],

  vHigh: ["احتيال مرجّح", "Likely a scam"], vMid: ["مشبوه", "Suspicious"], vLow: ["منخفض الخطورة", "Low risk"],
  confidence: ["ثقة التقييم", "Confidence"], cHigh: ["عالية", "High"], cMid: ["متوسطة", "Medium"], cLow: ["منخفضة", "Low"],
  impersonates: ["ينتحل: {x}", "Impersonates: {x}"], auto: ["رصد آلي", "Auto-detected"],
  linked: ["مرتبط بـ {n} من الحالات السابقة في السجل", "Linked to {n} earlier case(s) in the register"], via: ["عبر", "through"],
  priceT: ["تحليل السعر", "Price check"], advertised: ["السعر المعلن", "Advertised price"], typical: ["المعتاد في السوق", "Typical market price"],
  below: ["أقل من السوق بنحو {n}%", "About {n}% below market"],
  tactics: ["أساليب مرصودة", "Tactics seen"], accountT: ["الحساب", "The account"], imageT: ["الصورة", "The image"],
  linkT: ["فحص الروابط", "Link check"], flagsT: ["مؤشرات الخطورة", "Risk signals"], noFlags: ["لا توجد مؤشرات خطورة واضحة.", "No clear risk signals."], safeT: ["مؤشرات أمان", "Safe signals"],
  entT: ["البيانات المستخرجة", "Extracted details"], noEnt: ["لم تُستخرج بيانات.", "Nothing extracted."],
  e_phones: ["أرقام الهواتف", "Phone numbers"], e_ibans: ["حسابات بنكية (IBAN)", "Bank accounts (IBAN)"], e_domains: ["نطاقات", "Domains"], e_urls: ["روابط", "URLs"], e_accounts: ["حسابات تواصل", "Social accounts"], e_emails: ["بريد إلكتروني", "Email"],
  officerT: ["الإجراء المقترح", "Suggested action"], adviceT: ["نصيحة للجمهور", "Advice for the public"],
  deepRun: ["جاري الفحص المعمّق", "Deep check in progress"], deepRunD: ["يبحث في الإنترنت عن الحساب والأرقام وسعر السوق والإعلانات المتكررة والشكاوى. يستغرق عادة من دقيقة إلى دقيقتين، فابقِ على الصفحة.", "Searching the web for the account, numbers, market price, repeated ads and complaints. It usually takes one to two minutes, so keep this page open."],
  deepT: ["نتائج الفحص المعمّق", "Deep check results"], scoreAfter: ["الدرجة بعد الفحص: {n}", "Score after check: {n}"],
  sourcesT: ["المصادر", "Sources"], doneAt: ["اكتمل", "Completed"],
  deepBtn: ["فحص معمّق", "Run deep check"], deepAgain: ["إعادة الفحص المعمّق", "Run deep check again"],
  copyReport: ["نسخ تقرير الحالة", "Copy case report"], copied: ["تم نسخ التقرير", "Report copied"], reportT: ["تقرير الحالة", "Case report"], close: ["إغلاق", "Close"],
  a_account: ["الحساب", "Account"], a_link: ["الرابط", "Link"], a_image: ["الصورة", "Image"], a_price: ["السعر", "Price"], a_other: ["إعلانات أخرى", "Other ads"], a_complaints: ["شكاوى", "Complaints"],

  kitT: ["رفع البلاغ للمنصة", "Raise it with the platform"],
  kitD: ["الاحتيال في الغالب من خارج الدولة، فأسرع طريق لإيقافه بلاغ داخل المنصة مرفق بالأدلة. انسخ نص البلاغ وارفعه من حساب رادار أمان.", "Most of these scams run from outside the country, so the fastest way to stop one is a report inside the platform with evidence. Copy the report text and file it from the Radar Aman account."],
  kitSteps: ["الخطوات", "Steps"], kitEvid: ["الأدلة التي تذكرها في البلاغ", "Evidence to include in your report"],
  kitCopy: ["نسخ نص البلاغ", "Copy report text"], kitNote: ["أسماء القوائم قد تختلف حسب إصدار التطبيق. نص البلاغ بالإنجليزية لأن فرق الأمان في المنصات تعتمدها غالبًا.", "Menu names can differ between app versions. The report text is in English because platform safety teams mostly work in English."],
  kitNone: ["لا توجد أدلة كافية لصياغة بلاغ. شغّل الفحص المعمّق أولًا.", "Not enough evidence yet to write a report. Run the deep check first."],
  step_tiktok: ["افتح الفيديو ← زر المشاركة ← «إبلاغ» ← اختر الاحتيال أو الخداع. ثم افتح صفحة الحساب ← ⋯ ← إبلاغ.", "Open the video → Share → Report → choose fraud or scam. Then open the profile → ⋯ → Report."],
  step_instagram: ["اضغط ⋯ فوق المنشور أو الإعلان ← الإبلاغ ← احتيال. كرر الأمر من صفحة الحساب.", "Tap ⋯ above the post or ad → Report → Scam or fraud. Repeat from the profile page."],
  step_snapchat: ["اضغط مطولًا على السناب أو الإعلان ← إبلاغ ← اختر السبب. للحساب: الملف الشخصي ← ⋯ ← إبلاغ.", "Press and hold the Snap or ad → Report → choose the reason. For the account: profile → ⋯ → Report."],
  step_facebook: ["اضغط ⋯ فوق المنشور أو الإعلان ← الإبلاغ عن المنشور ← احتيال.", "Tap ⋯ above the post or ad → Report post → Scam."],
  step_whatsapp: ["افتح المحادثة ← ⋯ ← المزيد ← إبلاغ ← «إبلاغ وحظر».", "Open the chat → ⋯ → More → Report → Report and block."],
  step_sms: ["لا تضغط الرابط. احظر الرقم وأبلغ مزوّد الخدمة عن الرسالة، واحتفظ بلقطة الشاشة.", "Do not tap the link. Block the number, report the message to your mobile provider, and keep the screenshot."],
  step_web: ["أبلغ عن الموقع لقوقل (Safe Browsing: safebrowsing.google.com/safebrowsing/report_phish) ولمزوّد الاستضافة إن عُرف.", "Report the site to Google Safe Browsing (safebrowsing.google.com/safebrowsing/report_phish) and to the hosting provider if known."],
  step_gads: ["اضغط ⋮ بجانب الإعلان ← الإبلاغ عن الإعلان ← اختر الاحتيال.", "Tap ⋮ next to the ad → Report ad → choose scam."],
  step_other: ["ابحث عن خيار «إبلاغ» في المنصة، وأرفق الأدلة أدناه.", "Find the platform's Report option and attach the evidence below."],

  p_tiktok: ["تيك توك", "TikTok"], p_instagram: ["إنستقرام", "Instagram"], p_snapchat: ["سناب شات", "Snapchat"], p_facebook: ["فيسبوك", "Facebook"],
  p_whatsapp: ["واتساب", "WhatsApp"], p_sms: ["رسالة نصية SMS", "SMS message"], p_web: ["موقع إلكتروني", "Website"], p_gads: ["إعلان قوقل", "Google ad"], p_other: ["أخرى", "Other"],
  k_phone: ["هاتف", "Phone"], k_iban: ["آيبان", "IBAN"], k_site: ["موقع", "Site"], k_acct: ["حساب", "Account"], k_mail: ["بريد", "Email"], k_img: ["صورة", "Image"], k_imgdup: ["مكررة", "duplicate"],
  s0: ["جديد", "New"], s1: ["قيد المراجعة", "Under review"], s2: ["تم طلب الحذف من المنصة", "Takedown requested"], s3: ["محوّل للتحقيق", "Sent to investigation"], s4: ["آمن — لا إجراء", "Safe — no action"],

  sharedIn: ["وصل اللي شاركته. أضف لقطة شاشة للإعلان إذا تقدر، ثم اضغط «افحص».", "Your share arrived. Add a screenshot of the ad if you can, then tap Run check."],
  pct: ["نسبة الاحتيال", "Scam likelihood"],
  whyT: ["ليش؟", "Why?"], todoT: ["شو تسوي؟", "What should you do?"],
  linkedSimple: ["نفس الرقم أو الحساب أو الصورة ظهرت في {n} من الإعلانات المفحوصة قبل.", "The same number, account or image appeared in {n} ad(s) checked before."],
  reportBtn: ["أبلغ عن الإعلان", "Report this ad"], reporting: ["جاري الإبلاغ", "Reporting"],
  reported: ["تم الإبلاغ ✓", "Reported ✓"],
  reportedD: ["وصل بلاغك لفريق رادار أمان، وبنرفعه للمنصة مع الأدلة.", "Your report reached the Radar Aman team, and we will raise it with the platform with the evidence."],
  moreT: ["التفاصيل الكاملة", "Full details"],
  deepHint: ["الفحص المعمّق يبحث في الإنترنت عن الحساب والرقم والسعر، ويعطيك تفاصيل أكثر.", "The deep check searches the web for the account, number and price, and gives you more detail."],
  userReports: ["بلاغات الزوار: {n}", "Visitor reports: {n}"],
  sigAge: ["عمر الحساب", "Account age"], sigFollowers: ["المتابعون", "Followers"], sigEng: ["التفاعل", "Engagement"], sigComments: ["التعليقات", "Comments"],
  // admin
  tabPosts: ["منشورات التحذير", "Warning posts"],
  pIgOn: ["إنستقرام مربوط: الموافقة تنشر المنشور مباشرة.", "Instagram connected: approving publishes the post straight away."],
  pIgOff: ["إنستقرام غير مربوط بعد: الموافقة تحفظ المنشور، وتقدر تنزّل الصورة وتنسخ النص وتنشره يدويًا.", "Instagram not connected yet: approving saves the post, and you can download the image and copy the caption to post it yourself."],
  pIntro: ["كل حالة درجتها {n}% فأكثر يُجهَّز لها منشور توعية بدون أسماء أو أرقام. راجعه، عدّل إذا تحتاج، ثم وافق.", "Every case scoring {n}% or more gets an awareness post with no names or numbers. Review it, edit if needed, then approve."],
  pEmpty: ["لا توجد حالات بدرجة {n}% فأكثر حاليًا.", "No cases at {n}% or above right now."],
  pDraft: ["جهّز المنشور", "Draft the post"], pRedraft: ["أعد الصياغة", "Redraft"], pDrafting: ["جاري تجهيز المنشور", "Drafting the post"], pNoDraft: ["لم يُجهَّز بعد", "Not drafted yet"],
  pHead: ["العنوان على الصورة", "Headline on the image"], pPoints: ["علامات التحذير", "Warning signs"], pCaption: ["نص المنشور", "Caption"],
  pRule: ["الأسماء والأرقام والروابط تُحذف تلقائيًا من النص.", "Names, numbers and links are removed from the text automatically."],
  pDesign: ["تصميم المنشور", "Post design"], pModeShot: ["بصورة الإعلان", "With the screenshot"], pModeText: ["تصميم نصي", "Text design"],
  pUploadShot: ["ارفع صورة الإعلان", "Upload the ad screenshot"], pReplaceShot: ["استبدال الصورة", "Replace the screenshot"], pUploading: ["جاري الرفع", "Uploading"],
  pCover: ["إخفاء البيانات الخاصة", "Hide private details"], pDetecting: ["جاري كشف الأسماء والأرقام والوجوه", "Finding names, numbers and faces"],
  pCoverHelp: ["الصورة هي نفس اللي أرفقها الشخص عند الفحص. المربعات الداكنة تُخفى، والإطار المحدد هو الجزء اللي ينقص ويظهر في المنشور. اختر «إخفاء» أو «قص» ثم اسحب على الصورة، واضغط على أي مربع لإزالته.", "This is the same picture the person attached when checking. Dark boxes are hidden, and the framed part is what appears in the post. Pick Hide or Crop, then drag on the picture, and tap a box to remove it."],
  pToolHide: ["إخفاء", "Hide"], pToolCrop: ["قص", "Crop"], pClearCrop: ["إلغاء القص", "Clear crop"],
  pLowRes: ["هذه الحالة قديمة: انحفظت لها نسخة مصغرة فقط، فجودة الصورة منخفضة. الحالات الجديدة تُحفظ بجودة كاملة تلقائيًا.", "This is an older case: only a small copy was kept, so the picture is low quality. New cases are kept in full quality automatically."],
  pDetect: ["اكتشاف تلقائي", "Detect automatically"], pClearBoxes: ["مسح كل المربعات", "Clear all boxes"],
  pReviewed: ["راجعت الصورة وما فيها اسم أو رقم أو وجه أو رابط", "I checked the image: no names, numbers, faces or links"],
  pApprove: ["موافقة ونشر في إنستقرام", "Approve and publish to Instagram"], pApproveLocal: ["موافقة", "Approve"], pPublishing: ["جاري النشر", "Publishing"],
  pReject: ["رفض", "Reject"], pDownload: ["تنزيل الصورة", "Download image"], pCopyCap: ["نسخ النص", "Copy caption"], pOpen: ["فتح المنشور في إنستقرام", "Open the post on Instagram"],
  pPublished: ["تم النشر في إنستقرام", "Published to Instagram"], pApprovedNoIg: ["تمت الموافقة. نزّل الصورة وانسخ النص لنشره.", "Approved. Download the image and copy the caption to post it."],
  ps_none: ["بانتظار التجهيز", "Waiting for draft"], ps_draft: ["بانتظار الموافقة", "Awaiting approval"], ps_approved: ["تمت الموافقة", "Approved"], ps_published: ["منشور", "Published"], ps_rejected: ["مرفوض", "Rejected"],
  tabLib: ["مكتبة إعلانات ميتا", "Meta Ad Library"],
  libIntro: ["مكتبة إعلانات ميتا تعرض كل الإعلانات الشغّالة في الإمارات على فيسبوك وإنستقرام. افتح أي كلمة، صوّر الإعلان المشبوه، وافحصه من صفحة الفحص. المرحلة القادمة: يتم هذا تلقائيًا.", "Meta's Ad Library shows every ad running in the UAE on Facebook and Instagram. Open a keyword, screenshot a suspicious ad, and check it on the checker page. Next stage: this runs automatically."],
  libAdd: ["إضافة كلمة", "Add keyword"], libPh: ["مثال: شاليه للإيجار", "e.g. chalet for rent"], libOpen: ["افتح في المكتبة", "Open in library"], libRemove: ["إزالة", "Remove"], libSaved: ["تم حفظ الكلمات", "Keywords saved"],
  pw: ["كلمة السر", "Password"], enter: ["دخول", "Sign in"], entering: ["جاري الدخول", "Signing in"],
  dashSub: ["كل الحالات المفحوصة، مرتبة حسب الخطورة", "Every checked case, ordered by risk"], refresh: ["تحديث", "Refresh"],
  stChecked: ["تم فحصها", "Checked"], stHigh: ["عالية الخطورة", "High risk"], stNets: ["شبكات مرتبطة", "Linked networks"], stPending: ["بانتظار إجراء", "Awaiting action"],
  tabCases: ["الحالات", "Cases"], tabNets: ["الشبكات", "Networks"],
  fAllRisk: ["كل مستويات الخطورة", "All risk levels"], fHigh: ["عالية (70+)", "High (70+)"], fMid: ["متوسطة (40–69)", "Medium (40–69)"], fLow: ["منخفضة", "Low"],
  fAllStatus: ["كل الحالات", "All statuses"], fAllPlat: ["كل المنصات", "All platforms"],
  noCases: ["لا توجد حالات بعد.", "No cases yet."], noMatch: ["لا توجد حالات بهذه التصفية.", "No cases match these filters."],
  linkedN: ["مرتبط بـ {n}", "linked to {n}"], deepDone: ["فُحصت بعمق", "deep-checked"], deepRunning: ["فحص معمّق جارٍ", "deep check running"],
  details: ["التفاصيل", "Details"], copy: ["نسخ التقرير", "Copy report"], del: ["حذف", "Delete"], delConfirm: ["تأكيد الحذف", "Confirm delete"], deleted: ["تم الحذف", "Deleted"],
  netsNote: ["يربط النظام تلقائيًا الإعلانات التي تشترك في رقم هاتف أو حساب بنكي أو موقع أو حساب تواصل أو صورة مكررة، وهذا مؤشر على جهة واحدة خلفها.", "Ads that share a phone number, bank account, website, social account or a duplicate image are linked automatically. That points to one actor behind them."],
  noNets: ["لم تُكتشف شبكات بعد.", "No networks found yet."],
  netN: ["شبكة {i}: {n} إعلانات", "Network {i}: {n} ads"], maxRisk: ["أعلى خطورة {n}", "Top risk {n}"], common: ["القاسم المشترك", "In common"],
  eLoad: ["تعذر التحميل", "Could not load"], eUpd: ["تعذر التحديث", "Could not update"],
};
const tr = n => String(n ?? "");
export function makeT(lang) {
  const i = lang === "en" ? 1 : 0;
  const t = (k, v) => {
    let s = D[k] ? D[k][i] : k;
    if (v) for (const x in v) s = s.replace("{" + x + "}", v[x]);
    return s;
  };
  t.n = n => (i === 0 ? tr(n) : String(n ?? ""));
  return t;
}
export const PLATFORMS = [["تيك توك", "tiktok"], ["إنستقرام", "instagram"], ["سناب شات", "snapchat"], ["فيسبوك", "facebook"], ["واتساب", "whatsapp"], ["رسالة نصية SMS", "sms"], ["موقع إلكتروني", "web"], ["إعلان قوقل", "gads"], ["أخرى", "other"]];
export const platId = v => (PLATFORMS.find(p => p[0] === v) || [0, "other"])[1];
export const STATUSES = ["جديد", "قيد المراجعة", "تم طلب الحذف من المنصة", "محوّل للتحقيق", "آمن — لا إجراء"];
export const statusKey = v => "s" + Math.max(0, STATUSES.indexOf(v));
export const AREA_KEYS = { "الحساب": "a_account", "الرابط": "a_link", "الصورة": "a_image", "السعر": "a_price", "إعلانات أخرى": "a_other", "شكاوى": "a_complaints" };
export const KEY_KIND = { "هاتف": "k_phone", "آيبان": "k_iban", "موقع": "k_site", "حساب": "k_acct", "بريد": "k_mail", "صورة": "k_img" };
export const TACTIC_EN = { "تعليقات مقفلة": "Comments turned off", "سعر غير واقعي": "Unrealistic price", "استعجال وضغط زمني": "Urgency and time pressure", "عربون قبل المعاينة": "Deposit before viewing", "تواصل خارج المنصة": "Contact moved off the platform", "انتحال جهة رسمية": "Impersonating an official body", "طلب بيانات بنكية أو بطاقة": "Asks for bank or card details", "أرباح مضمونة": "Guaranteed profits", "صور مسروقة محتملة": "Possibly stolen photos", "حساب حديث أو ضعيف التفاعل": "New or low-engagement account", "رابط مشبوه": "Suspicious link" };
export const SCAM_EN = {};
