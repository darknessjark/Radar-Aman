"use client";
import { useState, useRef, useEffect, useId } from "react";

const HAS_LOGO = ["tiktok", "instagram", "snapchat", "facebook", "whatsapp", "sms", "web", "gads"];

function PlatIcon({ id }) {
  if (HAS_LOGO.includes(id)) return <img className="plat-ico" src={`/platforms/${id}.png`} alt="" width="26" height="26" />;
  return (
    <span className="plat-ico plat-other" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
    </span>
  );
}

// Dropdown with the platform logo beside each option (a native <select> cannot show images).
export default function PlatformSelect({ id, value, onChange, options, label }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const root = useRef(null);
  const list = useRef(null);
  const uid = useId();
  const idx = Math.max(0, options.findIndex(o => o.value === value));
  const cur = options[idx];

  useEffect(() => {
    if (!open) return;
    const down = e => { if (root.current && !root.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[hi]?.scrollIntoView({ block: "nearest" });
  }, [open, hi]);

  const openList = () => { setHi(idx); setOpen(true); };
  const pick = i => { onChange(options[i].value); setOpen(false); root.current?.querySelector("button")?.focus(); };

  const onKey = e => {
    const n = options.length;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => (h + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => (h - 1 + n) % n); }
    else if (e.key === "Home") { e.preventDefault(); setHi(0); }
    else if (e.key === "End") { e.preventDefault(); setHi(n - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(hi); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div className="plat-sel" ref={root}>
      <button
        type="button"
        id={id}
        className="plat-btn"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={uid}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
      >
        <PlatIcon id={cur.id} />
        <span className="plat-name">{cur.label}</span>
        <svg className="plat-chev" viewBox="0 0 12 8" width="12" height="8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <ul className="plat-list" id={uid} role="listbox" ref={list}>
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={(i === hi ? "hi " : "") + (o.value === value ? "on" : "")}
              onPointerEnter={() => setHi(i)}
              onClick={() => pick(i)}
            >
              <PlatIcon id={o.id} />
              <span className="plat-name">{o.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
