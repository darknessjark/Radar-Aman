// Accuracy of the live link check on real phishing links and real legitimate sites.
//
//   node --import ./scripts/resolve-hook.mjs scripts/eval-links.mjs [--phish 100]
//
// Phishing: a fresh sample of the public OpenPhish community feed (one link per registrable domain).
// Legitimate: every site on lib/official.js (UAE government, banks, utilities...) plus eval/legit-extra.txt.
// Runs the exact same code the app uses (lib/linkintel.js inspect) and writes eval/results/<date>.{md,csv,json}.
// Phishing links are stored defanged (hxxp, [.]) so the results file cannot be clicked by accident.
import fs from "node:fs";
import { inspect, registrable } from "../lib/linkintel.js";
import { OFFICIAL_DOMAINS } from "../lib/official.js";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const N_PHISH = +arg("--phish", 100), CONC = +arg("--conc", 8), PER = 25000;
const defang = u => String(u).replace(/^http/i, "hxxp").replace(/\./g, "[.]");

async function phishSample() {
  const r = await fetch("https://openphish.com/feed.txt", { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("OpenPhish feed " + r.status);
  const all = (await r.text()).split(/\r?\n/).map(s => s.trim()).filter(s => /^https?:\/\//.test(s));
  const seen = new Set(), out = [];
  // Deterministic shuffle by date so a run can be repeated the same day.
  const seed = new Date().toISOString().slice(0, 10);
  const h = s => { let x = 0; for (const c of seed + s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
  for (const u of all.sort((a, b) => h(a) - h(b))) {
    let reg; try { reg = registrable(new URL(u).hostname); } catch { continue; }
    if (seen.has(reg)) continue; seen.add(reg); out.push(u);
    if (out.length >= N_PHISH) break;
  }
  return { urls: out, feedSize: all.length };
}
function legitList() {
  const extra = fs.readFileSync("eval/legit-extra.txt", "utf8").split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith("#"));
  return [...new Set([...OFFICIAL_DOMAINS.map(d => "https://" + d + "/"), ...extra])];
}
async function pool(items, fn, n) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
const timed = u => Promise.race([inspect(u), new Promise(r => setTimeout(() => r({ input: u, error: "timeout", flags: [], score: null }), PER))]);

const { urls: phish, feedSize } = await phishSample();
const legit = legitList();
const items = [...phish.map(u => ({ u, label: "phish" })), ...legit.map(u => ({ u, label: "legit" }))];
console.log(`OpenPhish feed: ${feedSize} links, sampled ${phish.length} distinct domains. Legitimate: ${legit.length}.`);
const t0 = Date.now();
const res = await pool(items, async (it, k) => { const r = await timed(it.u); if (k % 20 === 0) console.log(`  ${k}/${items.length}`); return { ...it, r }; }, CONC);

const official = new Set(legit.filter(u => OFFICIAL_DOMAINS.some(d => u.includes(d))));
const sc = x => (typeof x.r.score === "number" ? x.r.score : 0);
function metrics(rows, thr) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  rows.forEach(x => { const p = sc(x) >= thr; if (x.label === "phish") p ? tp++ : fn++; else p ? fp++ : tn++; });
  const prec = tp + fp ? tp / (tp + fp) : null, rec = tp + fn ? tp / (tp + fn) : null, fpr = fp + tn ? fp / (fp + tn) : null;
  const f1 = prec && rec ? (2 * prec * rec) / (prec + rec) : null;
  return { thr, tp, fp, tn, fn, precision: prec, recall: rec, fpr, f1 };
}
const pct = v => (v == null ? "-" : (100 * v).toFixed(1) + "%");
const P = res.filter(x => x.label === "phish"), L = res.filter(x => x.label === "legit");
const reached = P.filter(x => x.r.reached), dead = P.filter(x => !x.r.reached);
const nonOff = L.filter(x => !official.has(x.u)), off = L.filter(x => official.has(x.u));
const m30 = metrics(res, 30), m60 = metrics(res, 60);
const subset = (rows, thr) => metrics(rows.concat(L), thr);
const signal = re => P.filter(x => (x.r.flags || []).some(f => re.test(f.e || ""))).length;
const fpRows = L.filter(x => sc(x) >= 30);
const day = new Date().toISOString().slice(0, 10);

const md = `# Link check accuracy — ${day}

Run of \`scripts/eval-links.mjs\` (the same \`inspect()\` the app uses). Took ${Math.round((Date.now() - t0) / 1000)} s.

**Data**
- Phishing: ${P.length} links from the public OpenPhish community feed on ${day} (${feedSize} links in the feed; one per registrable domain). ${reached.length} were still online when checked, ${dead.length} were already down or unreachable.
- Legitimate: ${L.length} sites. ${off.length} are on the official UAE list (government, banks, utilities, telcos, airlines, couriers); ${nonOff.length} are other real sites, including shops, news and login pages (\`eval/legit-extra.txt\`).

**Results** (a link is "flagged" when its link score reaches the threshold)

| Threshold | Caught (recall) | Precision | False alarms on legit sites | F1 | TP | FN | FP | TN |
|---|---|---|---|---|---|---|---|---|
| 30 (suspicious) | ${pct(m30.recall)} | ${pct(m30.precision)} | ${pct(m30.fpr)} | ${pct(m30.f1)} | ${m30.tp} | ${m30.fn} | ${m30.fp} | ${m30.tn} |
| 60 (high risk) | ${pct(m60.recall)} | ${pct(m60.precision)} | ${pct(m60.fpr)} | ${pct(m60.f1)} | ${m60.tp} | ${m60.fn} | ${m60.fp} | ${m60.tn} |

| Subset | Recall at 30 | Recall at 60 |
|---|---|---|
| Phishing still online (${reached.length}) | ${pct(subset(reached, 30).recall)} | ${pct(subset(reached, 60).recall)} |
| Phishing already down (${dead.length}) | ${pct(subset(dead, 30).recall)} | ${pct(subset(dead, 60).recall)} |

False alarms: official UAE sites ${off.filter(x => sc(x) >= 30).length} of ${off.length}; other legitimate sites ${nonOff.filter(x => sc(x) >= 30).length} of ${nonOff.length}.

**How often each signal fired on phishing links**: new domain (<30 days) ${signal(/only \d+ days old/)}, free hosting platform ${signal(/free hosting/)}, page asks for card/password/code ${signal(/asks for/)}, copies a known brand ${signal(/uses the name/)}, redirect or short link ${signal(/sends you to|Short link/)}, look-alike or risky name ${signal(/Resembles|ending is common|hyphens|Payment, verification|raw IP|Punycode|gov/)}.

${fpRows.length ? "**Legitimate sites flagged (score 30+)**\n\n" + fpRows.map(x => `- ${x.u} — ${sc(x)}: ${(x.r.flags || []).filter(f => f.pts > 0).map(f => f.e).join("; ")}`).join("\n") + "\n" : "No legitimate site reached a score of 30.\n"}
**Limits.** OpenPhish is global phishing (mostly fake login pages for big brands), not UAE scam ads, so this measures the link layer only. The AI reading of ad text and screenshots is not part of this number. Phishing pages die fast; links already down can only be judged by name, age and hosting. The legitimate set was chosen by hand. Rules were written before this run and were not tuned on it.
`;
fs.mkdirSync("eval/results", { recursive: true });
fs.writeFileSync(`eval/results/${day}.md`, md);
const csv = ["label,link,score,level,reached,final_domain,domain_age_days,hosting,reasons", ...res.map(x => [x.label, x.label === "phish" ? defang(x.u) : x.u, sc(x), x.r.level || "", x.r.reached ? 1 : 0,
  x.label === "phish" ? defang(x.r.finalDomain || "") : x.r.finalDomain || "", x.r.whois?.ageDays ?? "", x.r.hosting?.org || "", (x.r.flags || []).filter(f => f.pts > 0).map(f => f.e).join(" | ")]
  .map(v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(","))].join("\n");
fs.writeFileSync(`eval/results/${day}.csv`, csv);
console.log("\n" + md);
