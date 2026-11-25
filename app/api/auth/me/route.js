import { NextResponse } from "next/server";
import { readSession, COOKIE } from "@/lib/session";
import { UP } from "@/lib/uaepass";
export const runtime = "nodejs";
export async function GET(req) {
  const s = readSession(req.cookies.get(COOKIE)?.value);
  return NextResponse.json({ session: s ? { role: s.role, name: s.name, via: s.via, env: s.env } : null, uaepass: { env: UP().prod ? "production" : "staging" } });
}
