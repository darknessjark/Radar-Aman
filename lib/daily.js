// Everything the daily job does, each step independent so one failure doesn't stop the rest.
import { refreshFeeds } from "./threatintel";
import { runAndStore } from "./nrdstore";
import { watchLookalikes } from "./watch";
export async function daily() {
  const out = {};
  try { out.threatFeeds = await refreshFeeds(); } catch (e) { out.threatFeeds = { error: String(e?.message || e) }; }
  try { const r = await runAndStore(); out.newDomains = { date: r.date, total: r.total, lookalikes: r.hits.length, high: r.hits.filter(h => h.level === "high").length }; } catch (e) { out.newDomains = { error: String(e?.message || e) }; }
  try { out.watch = await watchLookalikes(); } catch (e) { out.watch = { error: String(e?.message || e) }; }
  return out;
}
