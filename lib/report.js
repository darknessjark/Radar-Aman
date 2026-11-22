export const riskColor = v => (v >= 70 ? "var(--red)" : v >= 40 ? "var(--amber)" : "var(--green)");
export const riskCls = v => (v >= 70 ? "red" : v >= 40 ? "amber" : "green");
export const toAr = n => String(n ?? "").replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
export const fmtDate = s => { try { return new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }); } catch { return s; } };

export function reportText(c, links = []) {
  const r = c.result || {}, e = r.entities || {}, d = c.deep;
  const L = (k, l) => ((e[k] || []).length ? `${l}: ${e[k].join("، ")}\n` : "");
  const p = r.price_analysis || {};
  return `تقرير رصد — رادار أمان
رقم الحالة: ${c.id}
تاريخ الرصد: ${fmtDate(c.createdAt)}
المنصة: ${c.platform}${c.sourceUrl ? "\nالرابط: " + c.sourceUrl : ""}
درجة الخطورة: ${d?.status === "done" ? `${d.score_after}/100 (بعد الفحص المعمّق، الأولية ${r.risk_score})` : `${r.risk_score}/100`} — ${r.verdict}
نوع الاحتيال: ${r.scam_type}${r.impersonated_entity ? "\nالجهة المنتحلة: " + r.impersonated_entity : ""}

الملخص: ${r.summary}
${p.advertised && p.market_estimate ? `تحليل السعر: المعلن ${p.advertised} — المعتاد ${p.market_estimate}${p.gap_percent ? ` (أقل بنحو ${p.gap_percent}٪)` : ""}\n` : ""}${(r.tactics || []).length ? `أساليب النصب: ${r.tactics.join("، ")}\n` : ""}
مؤشرات الخطورة:
${(r.red_flags || []).map((f, i) => `${i + 1}. ${f.title}: ${f.detail}`).join("\n") || "—"}

الكيانات:
${L("phones", "الهواتف")}${L("ibans", "الحسابات البنكية")}${L("domains", "النطاقات")}${L("accounts", "الحسابات")}${L("emails", "البريد")}${links.length ? `\nمرتبط بالحالات: ${links.map(l => l.id).join("، ")}\n` : ""}${d?.status === "done" ? `
نتائج الفحص المعمّق:
${d.summary || ""}
${(d.findings || []).map((f, i) => `${i + 1}. [${f.area}] ${f.title}: ${f.detail}`).join("\n")}
${(d.sources || []).length ? "المصادر: " + d.sources.join(" ، ") : ""}
` : ""}
الإجراء المقترح: ${r.officer_action}
حالة الملف: ${c.status}
بصمة الدليل (SHA-256): ${c.hash || "—"}`;
}
