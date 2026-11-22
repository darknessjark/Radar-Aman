// Fallback if the service worker is not active yet: pass link and text through the address bar.
export async function POST(req) {
  let q = "";
  try {
    const fd = await req.formData();
    const p = new URLSearchParams();
    ["url", "text", "title"].forEach(k => { const v = fd.get(k); if (typeof v === "string" && v) p.set(k, v.slice(0, 1500)); });
    p.set("share", "2");
    q = p.toString();
  } catch {}
  return Response.redirect(new URL("/?" + q, req.url), 303);
}
export async function GET(req) { return Response.redirect(new URL("/", req.url), 303); }
