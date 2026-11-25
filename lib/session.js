// Signed session cookie for officers who sign in with UAE PASS (HMAC-SHA256, HttpOnly, 12 hours).
import crypto from "crypto";
export const COOKIE = "ra_session";
const secret = () => process.env.SESSION_SECRET || (process.env.ADMIN_PASSWORD ? crypto.createHash("sha256").update("radar-aman-session|" + process.env.ADMIN_PASSWORD).digest("hex") : null);
const b64 = s => Buffer.from(s).toString("base64url");
const sign = data => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function makeSession(payload, hours = 12) {
  if (!secret()) throw new Error("NO_SESSION_SECRET");
  const data = b64(JSON.stringify({ ...payload, exp: Date.now() + hours * 36e5 }));
  return `${data}.${sign(data)}`;
}
export function readSession(value) {
  try {
    if (!value || !secret()) return null;
    const [data, mac] = String(value).split(".");
    const good = sign(data);
    if (!mac || mac.length !== good.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null;
    const p = JSON.parse(Buffer.from(data, "base64url").toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
export const cookieOpts = (maxAge = 12 * 3600) => ({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });
