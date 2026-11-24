// Entry point for future automatic collectors (decoy accounts, browser agents).
import { runScan } from "@/lib/scan";
import { json, fail } from "../_util";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(req) {
  const key = process.env.INGEST_KEY;
  if (!key || req.headers.get("x-ingest-key") !== key) return json({ error: "غير مصرح" }, 401);
  try {
    const body = await req.json();
    const r = await runScan(body, "رصد آلي");
    if (r.error) return json({ error: r.error }, r.status);
    return json(r);
  } catch (e) { return fail(e); }
}
