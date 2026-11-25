"use client";
import TopBar from "../components/TopBar";
import { useLang } from "../components/Lang";
import { RUNS, REPO_RESULTS } from "@/lib/accuracy";

export default function Accuracy() {
  const { t, lang } = useLang();
  return (
    <>
      <TopBar />
      <main className="wrap" style={{ maxWidth: 860 }}>
        <h1 className="h-page">{t("acT")}</h1>
        <p>{t("acIntro")}</p>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>{t("acRun")}</th><th>{t("acPhish")}</th><th>{t("acRecall")}</th><th>{t("acPrec")}</th><th>{t("acFpr")}</th><th>{t("acOfficial")}</th></tr></thead>
            <tbody>{RUNS.map(r => (
              <tr key={r.id}>
                <td><b>{r.id}</b> <span className="note ltr">{r.date}</span><br /><span className="note">{lang === "en" ? r.note : t("acNote_" + r.id)}</span></td>
                <td>{r.phish} <span className="note">({t("acLive", { n: r.live })})</span></td>
                <td>{r.recall}%</td><td>{r.precision}%</td><td>{r.fpr}% <span className="note">/ {r.legit}</span></td><td><b style={{ color: "var(--green)" }}>{r.official}</b></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <section className="panel"><h3>{t("acWhatT")}</h3><p style={{ margin: 0 }}>{t("acWhat")}</p></section>
        <section className="panel"><h3>{t("acLayersT")}</h3><p style={{ margin: 0 }}>{t("acLayers")}</p></section>
        <section className="panel"><h3>{t("acHowT")}</h3><p style={{ margin: 0 }}>{t("acHow")}</p>
          <p className="note" style={{ marginBottom: 0 }}><a href={REPO_RESULTS} target="_blank" rel="noopener noreferrer">{t("acRepo")}</a></p></section>
        <p className="note"><a href="/">{t("back")}</a></p>
      </main>
    </>
  );
}
