import { redis } from "./db";
import { scanLatest } from "./nrd";
// Keep each day's matches for 60 days.
export async function runAndStore() {
  const r = await scanLatest();
  const db = redis();
  await db.set(`nrd:${r.date}`, r, { ex: 60 * 60 * 24 * 60 });
  await db.zadd("nrd:dates", { score: Date.parse(r.date), member: r.date });
  return r;
}
export async function recent(n = 14) {
  const db = redis();
  const dates = await db.zrange("nrd:dates", 0, n - 1, { rev: true });
  if (!dates?.length) return [];
  return (await db.mget(...dates.map(d => `nrd:${d}`))).filter(Boolean);
}
