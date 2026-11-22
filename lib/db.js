import { Redis } from "@upstash/redis";

let r;
export function redis() {
  if (r) return r;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("NO_DB");
  r = new Redis({ url, token });
  return r;
}

export async function saveCase(c) {
  const db = redis();
  await db.set(`case:${c.id}`, c);
  await db.zadd("cases", { score: Date.parse(c.createdAt), member: c.id });
}

export async function getCase(id) {
  if (!/^[a-z0-9]{6,40}$/i.test(String(id || ""))) return null;
  return await redis().get(`case:${id}`);
}

export async function listCases(limit = 300) {
  const db = redis();
  const ids = await db.zrange("cases", 0, limit - 1, { rev: true });
  if (!ids || !ids.length) return [];
  const vals = await db.mget(...ids.map(i => `case:${i}`));
  return vals.filter(Boolean);
}

export async function deleteCase(id) {
  const db = redis();
  await db.del(`case:${id}`);
  await db.zrem("cases", id);
}

// Daily cap so a public link can't drain the API balance.
export async function allowToday(kind, limit) {
  const db = redis();
  const day = new Date().toISOString().slice(0, 10);
  const k = `rl:${kind}:${day}`;
  const n = await db.incr(k);
  if (n === 1) await db.expire(k, 60 * 60 * 48);
  return n <= limit;
}
