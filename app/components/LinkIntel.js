"use client";
import { useLang } from "./Lang";
import { fmtDate } from "@/lib/report";

const LC = { red: "var(--red)", amber: "var(--amber)", green: "var(--green)", none: "var(--line)" };
const day = s => (s ? String(s).slice(0, 10) : null);

// One opened link: where it really goes, who registered it and when, where it is hosted, what the page asks for.
export function LinkCard({ l }) {
  const { t, lang } = useLang();
  if (l.error) return <li style={{ borderInlineStartColor: LC.none }}><b className="ltr">{l.input}</b><span>{l.error}</span></li>;
  const w = l.whois, h = l.hosting, c = l.tls, p = l.page;
  const facts = [
    [t("li_age"), w?.ageDays != null ? t("li_days", { n: w.ageDays }) + (w.created ? ` (${day(w.created)})` : "") : l.freeHost ? t("li_freeHost") : w?.available === false ? t("li_noWhois") : null],
    [t("li_registrar"), w?.registrar],
    [t("li_ns"), (w?.nameservers || []).join(", ")],
    [t("li_host"), h ? [h.org, h.country, h.ip].filter(Boolean).join(" · ") : null],
    [t("li_tls"), c ? `${c.issuer || "?"} · ${day(c.validFrom)}${c.trusted ? "" : " · " + t("li_untrusted")}` : null],
    [t("li_title"), p?.title],
    [t("li_asks"), p ? [p.hasCard && t("li_card"), p.hasPassword && t("li_pass"), p.hasOtp && t("li_otp")].filter(Boolean).join("، ") || t("li_nothing") : null],
  ].filter(([, v]) => v);
  const lv = l.level || "none";
  return (
    <li className="li-card" style={{ borderInlineStartColor: LC[lv] || LC.none }}>
      <div className="li-head">
        <b className="ltr">{l.finalDomain || l.domain}</b>
        {typeof l.score === "number" && <span className={`pill ${lv === "none" ? "" : lv}`}>{t("li_score", { n: l.score })}</span>}
      </div>
      {(l.chain || []).length > 1 && (
        <ol className="li-chain ltr">{l.chain.map((x, i) => <li key={i}><code>{x.url.replace(/^https?:\/\//, "").slice(0, 70)}</code> <span className="note">{x.status || x.error || ""}{x.soft ? " (page)" : ""}</span></li>)}</ol>
      )}
      {facts.length > 0 && <dl className="li-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd dir="auto">{v}</dd></div>)}</dl>}
      {(l.flags || []).filter(f => f.level !== "none").length > 0 && (
        <ul className="li-flags">{l.flags.filter(f => f.level !== "none").map((f, i) => <li key={i} className={f.level}>{lang === "en" ? f.e : f.t}</li>)}</ul>
      )}
      <div className="note ltr" style={{ marginTop: 4 }}>{t("li_checked")} {fmtDate(l.checkedAt)}</div>
    </li>
  );
}

export default function LinkIntel({ list }) {
  const { t } = useLang();
  if (!list?.length) return null;
  return (
    <section className="panel">
      <h3>{t("li_T")}</h3>
      <p className="note" style={{ marginTop: 0 }}>{t("li_D")}</p>
      <ul className="flags">{list.map((l, i) => <LinkCard key={i} l={l} />)}</ul>
    </section>
  );
}
