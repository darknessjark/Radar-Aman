// UAE PASS sends the person back here with a one-time code (valid 10 minutes).
import { NextResponse } from "next/server";
import { exchangeCode, userInfo, roleFor, displayName, ids, UP } from "@/lib/uaepass";
import { makeSession, COOKIE, cookieOpts } from "@/lib/session";
import { redis } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(req) {
  const u = new URL(req.url);
  const back = (q) => { const r = NextResponse.redirect(`${u.origin}/admin?${new URLSearchParams(q)}`); r.cookies.delete("ra_oauth_state"); return r; };
  if (u.searchParams.get("error")) return back({ uaepass: "cancelled" });
  const state = u.searchParams.get("state"), code = u.searchParams.get("code");
  if (!code || !state || state !== req.cookies.get("ra_oauth_state")?.value) return back({ uaepass: "badstate" });
  try {
    const info = await userInfo(await exchangeCode(u.origin, code));
    const role = roleFor(info);
    const who = displayName(info);
    try { await redis().lpush("audit", JSON.stringify({ at: new Date().toISOString(), event: role ? "login" : "login-denied", via: UP().prod ? "uaepass" : "uaepass-staging", who, id: info.uuid || info.sub || null, role })); await redis().ltrim("audit", 0, 999); } catch {}
    if (!role) return back({ uaepass: "denied", id: info.uuid || info.sub || ids(info)[0] || "" });
    const res = back({ uaepass: "ok" });
    res.cookies.set(COOKIE, makeSession({ role, name: who, sub: info.uuid || info.sub || null, userType: info.userType || null, via: "uaepass", env: UP().prod ? "production" : "staging" }), cookieOpts());
    return res;
  } catch (e) {
    console.error("uaepass", String(e?.message || e));
    return back({ uaepass: "failed" });
  }
}
