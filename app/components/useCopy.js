"use client";
import { useState } from "react";
export default function useCopy() {
  const [toast, setToast] = useState("");
  const [fallback, setFallback] = useState(null);
  const show = m => { setToast(m); setTimeout(() => setToast(""), 2500); };
  const copy = async text => {
    try { await navigator.clipboard.writeText(text); show("تم نسخ التقرير"); }
    catch { setFallback(text); }
  };
  const ui = (<>
    {toast && <div className="toast">{toast}</div>}
    {fallback && <div className="modal" onClick={e => e.target === e.currentTarget && setFallback(null)}>
      <div className="card"><h3 style={{ marginTop: 0 }}>تقرير الحالة</h3><textarea readOnly style={{ minHeight: 380 }} value={fallback} />
        <div className="row"><button className="btn ghost sm" onClick={() => setFallback(null)}>إغلاق</button></div></div>
    </div>}
  </>);
  return { copy, show, ui };
}
