"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { makeT } from "@/lib/i18n";
const Ctx = createContext({ lang: "ar", t: makeT("ar"), setLang: () => {} });
export const useLang = () => useContext(Ctx);
export function LangProvider({ children }) {
  const [lang, setL] = useState("ar");
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search).get("lang");
      const s = q || localStorage.getItem("radar-lang");
      if (s === "en" || s === "ar") setL(s);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = l => { setL(l); try { localStorage.setItem("radar-lang", l); } catch {} };
  const value = useMemo(() => ({ lang, t: makeT(lang), setLang }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
