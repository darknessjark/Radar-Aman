import { runScan } from "@/lib/scan";
import { json, fail } from "../_util";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req) {
  try {
    const body = await req.json();
    const r = await runScan(body, "عام");
    if (r.error) return json({ error: r.error }, r.status);
    return json(r);
  } catch (e) { return fail(e); }
}
