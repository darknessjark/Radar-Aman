"use client";
import { useEffect, useState } from "react";
const pt = (v, r) => { const a = Math.PI * (1 - v / 100); return [100 + r * Math.cos(a), 100 - r * Math.sin(a)]; };
const arc = (a, b, r) => { const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r); return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`; };
export default function Dial({ value = 0, color, label }) {
  const [v, setV] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setV(value)); return () => cancelAnimationFrame(id); }, [value]);
  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);
  return (
    <div className="dial" role="img" aria-label={`${value} / 100`}>
      <svg viewBox="0 0 200 118">
        <path d={arc(0, 40, 80)} className="trk g" /><path d={arc(40, 70, 80)} className="trk a" /><path d={arc(70, 100, 80)} className="trk r" />
        <path d={arc(0, 100, 80)} className="prog" stroke={color} pathLength="100" style={{ strokeDasharray: `${v} 100` }} />
        {ticks.map(i => { const [x1, y1] = pt(i, i % 10 === 0 ? 64 : 67), [x2, y2] = pt(i, 71); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={i % 10 === 0 ? "tk big" : "tk"} />; })}
        <g className="needle" style={{ transform: `rotate(${(v / 100) * 180}deg)` }}><line x1="100" y1="100" x2="42" y2="100" stroke="#0A2A5E" strokeWidth="2.4" strokeLinecap="round" /></g>
        <circle cx="100" cy="100" r="5.5" fill="#0A2A5E" />
      </svg>
      <div className="dial-num" style={{ color }}>{label ?? value}</div>
    </div>
  );
}
