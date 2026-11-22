"use client";
import { useEffect, useState } from "react";
import { useLang } from "../components/Lang";
const libUrl = q => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=AE&media_type=all&search_type=keyword_unordered&q=${encodeURIComponent(q)}`;
export default function Library({ pw, show }) {
  const { t } = useLang();
  const [kw, setKw] = useState([]);
  const [nw, setNw] = useState("");
  useEffect(() => { fetch("/api/admin/watch", { headers: { "x-admin-password": pw } }).then(r => r.json()).then(j => setKw(j.keywords || [])).catch(() => {}); }, [pw]);
  const save = async list => {
    setKw(list);
    const r = await fetch("/api/admin/watch", { method: "POST", headers: { "content-type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ keywords: list }) });
    if (r.ok) show(t("libSaved"));
  };
  return (<>
    <p className="note" style={{ marginTop: 0 }}>{t("libIntro")}</p>
    <div className="row" style={{ marginTop: 0, marginBottom: 14 }}>
      <input type="text" dir="auto" style={{ maxWidth: 320 }} value={nw} placeholder={t("libPh")} onChange={e => setNw(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && nw.trim()) { save([nw.trim(), ...kw]); setNw(""); } }} />
      <button className="btn sm" disabled={!nw.trim()} onClick={() => { save([nw.trim(), ...kw]); setNw(""); }}>{t("libAdd")}</button>
    </div>
    <div className="libgrid">
      {kw.map(k => (
        <div className="libitem" key={k}>
          <b dir="auto">{k}</b>
          <div className="row" style={{ marginTop: 8 }}>
            <a className="btn sm" href={libUrl(k)} target="_blank" rel="noopener noreferrer">{t("libOpen")}</a>
            <button className="btn ghost sm" onClick={() => save(kw.filter(x => x !== k))}>{t("libRemove")}</button>
          </div>
        </div>
      ))}
    </div>
  </>);
}
