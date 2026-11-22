// Links cases that share a phone, IBAN, domain, account, email or a near-identical image.
export function keysOf(c) {
  const e = c?.result?.entities || {};
  const ks = new Set();
  (e.phones || []).forEach(p => { const d = String(p).replace(/\D/g, ""); if (d.length >= 7) ks.add("هاتف|" + d.slice(-9)); });
  (e.ibans || []).forEach(p => { const d = String(p).replace(/\s/g, "").toUpperCase(); if (d.length >= 15) ks.add("آيبان|" + d); });
  (e.domains || []).forEach(p => {
    const d = String(p).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    if (d.includes(".") && !/(instagram|tiktok|snapchat|facebook|youtube|wa\.me|whatsapp)/.test(d)) ks.add("موقع|" + d);
  });
  (e.accounts || []).forEach(p => { const d = String(p).toLowerCase().replace(/^@/, "").trim(); if (d.length >= 4) ks.add("حساب|" + d); });
  (e.emails || []).forEach(p => { const d = String(p).toLowerCase().trim(); if (d.includes("@")) ks.add("بريد|" + d); });
  return ks;
}

const ham = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
export const imgMatch = (a, b) => (a.phash || []).some(h => (b.phash || []).some(k => h && k && h.length === k.length && ham(h, k) <= 8));

export function linkedTo(c, cases) {
  const ks = keysOf(c);
  const out = [];
  cases.forEach(o => {
    if (!o || o.id === c.id) return;
    const shared = [...keysOf(o)].filter(k => ks.has(k));
    if (imgMatch(c, o)) shared.push("صورة|مكررة");
    if (shared.length) out.push({ o, shared });
  });
  return out;
}

export function networks(list) {
  const parent = {};
  const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };
  const byKey = {};
  list.forEach(c => { parent[c.id] = c.id; keysOf(c).forEach(k => (byKey[k] = byKey[k] || []).push(c.id)); });
  Object.values(byKey).forEach(ids => ids.slice(1).forEach(id => union(ids[0], id)));
  const withH = list.filter(c => (c.phash || []).length);
  const imgIds = new Set();
  for (let i = 0; i < withH.length; i++) for (let j = i + 1; j < withH.length; j++) if (imgMatch(withH[i], withH[j])) {
    union(withH[i].id, withH[j].id); imgIds.add(withH[i].id); imgIds.add(withH[j].id);
  }
  const groups = {};
  list.forEach(c => (groups[find(c.id)] = groups[find(c.id)] || []).push(c));
  return Object.values(groups).filter(g => g.length > 1).map(g => {
    const ids = new Set(g.map(c => c.id));
    const shared = Object.entries(byKey).filter(([, v]) => v.length > 1 && v.some(id => ids.has(id))).map(([k]) => k);
    if (g.some(c => imgIds.has(c.id))) shared.push("صورة|مكررة");
    return { members: g, shared };
  }).sort((a, b) => b.members.length - a.members.length);
}
