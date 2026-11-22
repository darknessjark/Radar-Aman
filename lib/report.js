export const riskColor = v => (v >= 70 ? "var(--red)" : v >= 40 ? "var(--amber)" : "var(--green)");
export const riskCls = v => (v >= 70 ? "red" : v >= 40 ? "amber" : "green");
export const verdictKey = v => (v >= 70 ? "vHigh" : v >= 40 ? "vMid" : "vLow");
export const toAr = n => String(n ?? "").replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
export const fmtDate = s => { try { return new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }); } catch { return s; } };

const finalScore = c => (c.deep?.status === "done" && typeof c.deep.score_after === "number" ? c.deep.score_after : c.result?.risk_score ?? 0);

// Numbered evidence points: initial red flags first, then red/amber deep-check findings.
export function evidenceList(c) {
  const r = c.result || {}, out = [];
  (r.red_flags || []).slice(0, 5).forEach(f => out.push(f.detail ? `${f.title}: ${f.detail}` : f.title));
  if (c.deep?.status === "done") (c.deep.findings || []).filter(f => f.level === "red" || f.level === "amber").slice(0, 4).forEach(f => out.push(`${f.title}: ${f.detail}`));
  return out;
}

// Text to paste into a platform's "Report" form. English first: platform safety teams mostly work in English.
export function platformReport(c) {
  const r = c.result || {}, e = r.entities || {}, p = r.price_analysis || {};
  const ev = evidenceList(c);
  const lines = [
    "Report: suspected online scam (fraudulent advertisement)",
    `Platform: ${c.platform}`,
    c.sourceUrl ? `Account / link: ${c.sourceUrl}` : "",
    (e.accounts || []).length ? `Account handle(s): ${e.accounts.join(", ")}` : "",
    (e.phones || []).length ? `Phone number(s) in the ad: ${e.phones.join(", ")}` : "",
    r.scam_type && r.scam_type !== "لا يوجد" ? `Type: ${r.scam_type}` : "",
    p.advertised ? `Advertised price: ${p.advertised}${p.market_estimate ? ` (typical: ${p.market_estimate})` : ""}` : "",
    "",
    "Evidence:",
    ...(ev.length ? ev.map((x, i) => `${i + 1}. ${x}`) : ["(none recorded)"]),
    "",
    `Risk score: ${finalScore(c)}/100. Checked with Radar Aman on ${fmtDate(c.createdAt)} (Dubai time). Case ${c.id}. Evidence hash (SHA-256): ${c.hash || "-"}.`
  ];
  return lines.filter((x, i) => x !== "" || lines[i - 1] !== "").join("\n").trim();
}

const L = {
  ar: { title: "تقرير رصد — رادار أمان", id: "رقم الحالة", date: "تاريخ الرصد", plat: "المنصة", link: "الرابط", score: "درجة الخطورة", after: "بعد الفحص المعمّق، الأولية", type: "نوع الاحتيال", imp: "الجهة المنتحلة", sum: "الملخص", price: "تحليل السعر", adv: "المعلن", typ: "المعتاد", tact: "الأساليب", flags: "مؤشرات الخطورة", ents: "البيانات", phones: "الهواتف", ibans: "الحسابات البنكية", doms: "النطاقات", accts: "الحسابات", mails: "البريد", linked: "مرتبط بالحالات", deep: "نتائج الفحص المعمّق", src: "المصادر", act: "الإجراء المقترح", status: "حالة الملف", hash: "بصمة الدليل (SHA-256)", sep: "، " },
  en: { title: "Case report — Radar Aman", id: "Case ID", date: "Date checked", plat: "Platform", link: "Link", score: "Risk score", after: "after deep check, initial", type: "Scam type", imp: "Impersonated body", sum: "Summary", price: "Price check", adv: "advertised", typ: "typical", tact: "Tactics", flags: "Risk signals", ents: "Details", phones: "Phones", ibans: "Bank accounts", doms: "Domains", accts: "Accounts", mails: "Email", linked: "Linked to cases", deep: "Deep check results", src: "Sources", act: "Suggested action", status: "Case status", hash: "Evidence hash (SHA-256)", sep: ", " }
};
export function reportText(c, links = [], lang = "ar") {
  const w = L[lang] || L.ar;
  const r = c.result || {}, e = r.entities || {}, d = c.deep, p = r.price_analysis || {};
  const line = (k, l) => ((e[k] || []).length ? `${l}: ${e[k].join(w.sep)}\n` : "");
  return `${w.title}
${w.id}: ${c.id}
${w.date}: ${fmtDate(c.createdAt)}
${w.plat}: ${c.platform}${c.sourceUrl ? `\n${w.link}: ${c.sourceUrl}` : ""}
${w.score}: ${d?.status === "done" ? `${d.score_after}/100 (${w.after} ${r.risk_score})` : `${r.risk_score}/100`}
${w.type}: ${r.scam_type}${r.impersonated_entity ? `\n${w.imp}: ${r.impersonated_entity}` : ""}

${w.sum}: ${r.summary}
${p.advertised && p.market_estimate ? `${w.price}: ${w.adv} ${p.advertised} — ${w.typ} ${p.market_estimate}\n` : ""}${(r.tactics || []).length ? `${w.tact}: ${r.tactics.join(w.sep)}\n` : ""}
${w.flags}:
${(r.red_flags || []).map((f, i) => `${i + 1}. ${f.title}: ${f.detail}`).join("\n") || "—"}

${w.ents}:
${line("phones", w.phones)}${line("ibans", w.ibans)}${line("domains", w.doms)}${line("accounts", w.accts)}${line("emails", w.mails)}${links.length ? `\n${w.linked}: ${links.map(l => l.id).join(w.sep)}\n` : ""}${d?.status === "done" ? `
${w.deep}:
${d.summary || ""}
${(d.findings || []).map((f, i) => `${i + 1}. [${f.area}] ${f.title}: ${f.detail}`).join("\n")}
${(d.sources || []).length ? `${w.src}: ` + d.sources.join(" , ") : ""}
` : ""}
${w.act}: ${r.officer_action}
${w.status}: ${c.status}
${w.hash}: ${c.hash || "—"}`;
}
