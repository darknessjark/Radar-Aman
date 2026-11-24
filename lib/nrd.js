// Early warning: every day, read the public list of newly registered domains (whoisds.com free feed,
// domains registered the day before) and pick out the ones that imitate UAE bodies, banks and couriers,
// usually days before the first scam message goes out.
import { unzipSync, strFromU8 } from "fflate";
import { isOfficial } from "./official";

export const WATCH = [
  ["TAMM", ["tamm"]], ["Abu Dhabi Police", ["adpolice", "abudhabipolice", "shurta"]], ["Dubai Police", ["dubaipolice"]], ["UAE PASS", ["uaepass"]],
  ["ICP", ["icp", "icpuae", "icpgov"]], ["MOI", ["moiuae", "uaemoi"]], ["RTA", ["rta", "rtadubai"]], ["Salik", ["salik"]], ["Darb", ["darb"]],
  ["Emirates Post", ["emiratespost", "emiratepost", "uaepost"]], ["Aramex", ["aramex"]], ["Etisalat / e&", ["etisalat"]], ["DEWA", ["dewa"]], ["SEWA", ["sewa"]],
  ["ADDC", ["addc"]], ["ADCB", ["adcb"]], ["FAB", ["bankfab"]], ["Emirates NBD", ["emiratesnbd", "enbd"]], ["ADIB", ["adib"]], ["Mashreq", ["mashreq"]],
  ["RAKBANK", ["rakbank"]], ["MOHRE", ["mohre"]], ["GDRFA", ["gdrfa", "gdrfad"]], ["Nol", ["nolcard"]], ["Mawaqif", ["mawaqif"]], ["ADNOC", ["adnoc"]],
  ["Emirates ID", ["emiratesid"]], ["UAE Government", ["uaegov", "govae"]], ["Customs", ["adcustoms", "dubaicustoms"]]
];
const RISKY = ["pay", "payment", "fine", "fines", "refund", "verify", "verification", "update", "track", "tracking", "parcel", "delivery", "login", "secure", "service", "services",
  "portal", "gov", "uae", "ae", "online", "support", "bill", "card", "reward", "rewards", "points", "gift", "renew", "pass", "id", "account", "help", "customs", "fee", "fees", "dxb", "auh", "toll", "visa", "permit", "online"];
const BAD_TLD = ["xyz", "top", "shop", "online", "site", "click", "info", "buzz", "live", "icu", "store", "vip", "win", "cfd", "sbs", "rest", "lol", "cyou", "monster", "bond", "lat", "help"];

const lev1 = (a, b) => {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, d = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++d > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return d + (a.length - i) + (b.length - j) <= 1;
};

// Does one domain imitate a watched name? Returns {brand, level, why} or null.
export function matchDomain(domain) {
  const d = String(domain || "").toLowerCase().trim();
  if (!d.includes(".") || isOfficial(d)) return null;
  const parts = d.split("."), tld = parts.pop(), label = parts.join(".");
  const toks = label.split(/[-_.\d]+/).filter(Boolean);
  const risky = toks.some(t => RISKY.includes(t)) || BAD_TLD.includes(tld);
  for (const [brand, words] of WATCH) {
    for (const w of words) {
      let why = null;
      if (toks.includes(w)) why = "exact";
      else if (w.length >= 4 && toks.some(t => {
        if (!t.includes(w)) return false;
        const rest = t.replace(w, "");
        return RISKY.some(r => rest === r || (r.length >= 3 && (rest.startsWith(r) || rest.endsWith(r))));
      })) why = "joined";
      else if (w.length >= 6 && toks.some(t => t.length >= 6 && lev1(t, w))) why = "typo";
      if (why) {
        const level = risky || why !== "exact" ? "high" : "medium";
        return { domain: d, brand, level, why: `${why}:${w}${risky ? "+risky" : ""}` };
      }
    }
  }
  return null;
}

const day = offset => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10);

// Download and scan one day's list. The free list for day D is published on D+1.
export async function scanDay(date) {
  const name = Buffer.from(`${date}.zip`).toString("base64");
  const r = await fetch(`https://www.whoisds.com//whois-database/newly-registered-domains/${name}/nrd`, { signal: AbortSignal.timeout(60000), headers: { "user-agent": "RadarAman/1.0 (+https://radar-aman.vercel.app)" } });
  if (!r.ok) throw new Error(`NRD ${date}: ${r.status}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error(`NRD ${date}: not a zip (list not published yet?)`);
  const files = unzipSync(buf);
  const text = Object.values(files).map(f => strFromU8(f)).join("\n");
  const domains = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const hits = [];
  for (const dm of domains) { const m = matchDomain(dm); if (m) hits.push(m); }
  hits.sort((a, b) => (a.level === b.level ? a.domain.localeCompare(b.domain) : a.level === "high" ? -1 : 1));
  return { date, total: domains.length, hits: hits.slice(0, 500), scannedAt: new Date().toISOString() };
}

export async function scanLatest() {
  let last;
  for (const off of [1, 2, 3]) { try { return await scanDay(day(off)); } catch (e) { last = e; } }
  throw last;
}
