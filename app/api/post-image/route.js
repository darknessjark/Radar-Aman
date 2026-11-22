import { redis } from "@/lib/db";
export const runtime = "nodejs";
// Public on purpose: Instagram fetches the image from this address. Images carry no names or numbers.
export async function GET(req) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[a-z0-9]{6,40}$/i.test(id)) return new Response("not found", { status: 404 });
  const b64 = await redis().get(`postimg:${id}`);
  if (!b64) return new Response("not found", { status: 404 });
  return new Response(Buffer.from(b64, "base64"), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" } });
}
