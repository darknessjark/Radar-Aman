import crypto from "crypto";
import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/uaepass";
export const runtime = "nodejs";
import { sessionsEnabled } from "@/lib/session";
export async function GET(req) {
  const u = new URL(req.url);
  if (!sessionsEnabled()) return NextResponse.redirect(`${u.origin}/admin?uaepass=nosecret`);
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(u.origin, state, u.searchParams.get("lang")));
  res.cookies.set("ra_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
