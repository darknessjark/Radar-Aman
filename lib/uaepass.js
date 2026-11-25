// UAE PASS sign-in (OAuth 2.0 authorization code). Staging by default, with UAE PASS's public sandbox
// credentials ("sandbox_stage"), which work only on stg-id.uaepass.ae. Production needs the credentials
// UAE PASS issues to an onboarded service provider (UAEPASS_ENV=production + client id and secret).
export const UP = () => {
  const prod = process.env.UAEPASS_ENV === "production";
  const base = prod ? "https://id.uaepass.ae/idshub" : "https://stg-id.uaepass.ae/idshub";
  return {
    prod, base,
    clientId: process.env.UAEPASS_CLIENT_ID || (prod ? "" : "sandbox_stage"),
    clientSecret: process.env.UAEPASS_CLIENT_SECRET || (prod ? "" : "sandbox_stage"),
    scope: process.env.UAEPASS_SCOPE || "urn:uae:digitalid:profile:general",
    acr: process.env.UAEPASS_ACR || "urn:safelayer:tws:policies:authentication:level:low"
  };
};
export const redirectUri = origin => process.env.UAEPASS_REDIRECT_URI || `${origin}/api/auth/uaepass/callback`;

export function authorizeUrl(origin, state, lang = "ar") {
  const c = UP();
  const q = new URLSearchParams({ response_type: "code", client_id: c.clientId, scope: c.scope, state, redirect_uri: redirectUri(origin), acr_values: c.acr, ui_locales: lang === "en" ? "en" : "ar" });
  return `${c.base}/authorize?${q}`;
}

export async function exchangeCode(origin, code) {
  const c = UP();
  const params = new URLSearchParams({ grant_type: "authorization_code", redirect_uri: redirectUri(origin), code });
  const auth = "Basic " + Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64");
  // Standard form body first; UAE PASS's own samples put the same values in the query string, so try that too.
  for (const [url, body, type] of [[`${c.base}/token`, params.toString(), "application/x-www-form-urlencoded"], [`${c.base}/token?${params}`, "", "multipart/form-data"]]) {
    const r = await fetch(url, { method: "POST", headers: { authorization: auth, "content-type": type, accept: "application/json" }, body: body || undefined, signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.access_token) return j.access_token;
  }
  throw new Error("UAEPASS_TOKEN");
}

export async function userInfo(token) {
  const r = await fetch(`${UP().base}/userinfo`, { headers: { authorization: `Bearer ${token}`, accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("UAEPASS_USERINFO " + r.status);
  return r.json();
}

// Who may sign in: UAEPASS_OFFICERS (can change things) and UAEPASS_JUDGES (view only), comma-separated.
// Any of the person's identifiers can be listed: UAE PASS uuid, email, mobile or Emirates ID number.
const list = v => String(v || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
export function ids(u) {
  return [u.uuid, u.sub, u.email, u.mobile, u.idn].filter(Boolean).map(x => String(x).toLowerCase().replace(/^\+/, ""));
}
export function roleFor(u) {
  // Staging accounts are self-registered and unverified, so there only the UAE PASS uuid (which nobody can choose)
  // counts. In production the account must be verified (SOP2 or SOP3) and any identifier may be listed.
  const prod = UP().prod;
  if (prod && !/^SOP[23]$/i.test(String(u.userType || ""))) return null;
  const mine = (prod ? ids(u) : [u.uuid, u.sub].filter(Boolean).map(x => String(x).toLowerCase())).flatMap(x => [x, x.replace(/-/g, "")]);
  const has = l => list(l).some(x => mine.includes(x.replace(/^\+/, "")) || mine.includes(x.replace(/^\+/, "").replace(/-/g, "")));
  if (has(process.env.UAEPASS_OFFICERS)) return "admin";
  if (has(process.env.UAEPASS_JUDGES)) return "judge";
  return null;
}
export const displayName = u => u.fullnameAR || u.fullnameEN || [u.firstnameEN, u.lastnameEN].filter(Boolean).join(" ") || u.email || "UAE PASS";
