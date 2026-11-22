"use client";
import Logo from "./Logo";
import { useLang } from "./Lang";
export default function TopBar({ children, home = "/" }) {
  const { t, lang, setLang } = useLang();
  return (
    <header className="top">
      <div className="top-in">
        <a className="brand" href={home}><Logo /><span className="brand-name">{t("app")}</span></a>
        <span className="tag">{t("proto")}</span>
        <div className="top-end">
          {children}
          <button type="button" className="langbtn" onClick={() => setLang(lang === "ar" ? "en" : "ar")} lang={lang === "ar" ? "en" : "ar"}>{t("switchTo")}</button>
        </div>
      </div>
    </header>
  );
}
