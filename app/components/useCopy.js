"use client";
import { useState } from "react";
import { useLang } from "./Lang";
export default function useCopy() {
  const { t } = useLang();
  const [toast, setToast] = useState("");
  const [fallback, setFallback] = useState(null);
  const show = m => { setToast(m); setTimeout(() => setToast(""), 2500); };
  const copy = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); show(msg || t("copied")); }
    catch { setFallback(text); }
  };
  const ui = (<>
    {toast && <div className="toast" role="status">{toast}</div>}
    {fallback && <div className="modal" onClick={e => e.target === e.currentTarget && setFallback(null)}>
      <div className="sheet"><h3 style={{ marginTop: 0 }}>{t("reportT")}</h3><textarea readOnly dir="auto" style={{ minHeight: 380 }} value={fallback} />
        <div className="row"><button className="btn ghost sm" onClick={() => setFallback(null)}>{t("close")}</button></div></div>
    </div>}
  </>);
  return { copy, show, ui };
}
