// Runs the daily new-domain scan once and prints what it found (same code as /api/cron/nrd, without storage).
//   node --import ./scripts/resolve-hook.mjs scripts/nrd-check.mjs
import { scanLatest } from "../lib/nrd.js";
const r = await scanLatest();
const high = r.hits.filter(h => h.level === "high");
console.log(`${r.date}: ${r.total} new domains, ${r.hits.length} look-alikes (${high.length} high).`);
for (const h of r.hits.slice(0, 60)) console.log(`${h.level.padEnd(6)} ${h.brand.padEnd(16)} ${h.domain.replace(/\./g, "[.]")}  ${h.why}`);
