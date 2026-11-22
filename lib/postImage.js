// Draws the Instagram warning image in the browser (the browser shapes Arabic text correctly).
const W = 1080, H = 1350;
function wrap(ctx, text, maxW) {
  const words = String(text || "").split(/\s+/).filter(Boolean), lines = [];
  let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
export async function renderPostImage({ headline, points = [], scamType }) {
  try { await Promise.all(['700 80px "Readex Pro"', '600 40px "Readex Pro"', '500 38px "IBM Plex Sans Arabic"'].map(f => document.fonts.load(f, "رادار"))); } catch {}
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#0D1B2A"; x.fillRect(0, 0, W, H);
  // radar rings
  x.save(); x.strokeStyle = "rgba(111,203,211,0.10)"; x.lineWidth = 2;
  [160, 290, 420, 550].forEach(r => { x.beginPath(); x.arc(120, 1230, r, 0, Math.PI * 2); x.stroke(); });
  x.beginPath(); x.moveTo(120, 1230); x.lineTo(560, 790); x.stroke(); x.restore();
  x.direction = "rtl"; x.textAlign = "right";
  const R = W - 90;
  // label
  x.fillStyle = "#C23A2B"; x.beginPath(); x.roundRect(R - 250, 96, 250, 64, 32); x.fill();
  x.fillStyle = "#fff"; x.font = '600 34px "Readex Pro", sans-serif'; x.textAlign = "center"; x.fillText("تحذير احتيال", R - 125, 140);
  x.textAlign = "right";
  if (scamType) { x.fillStyle = "#6FCBD3"; x.font = '500 34px "IBM Plex Sans Arabic", sans-serif'; x.fillText(scamType, R, 232); }
  // headline
  x.fillStyle = "#fff"; x.font = '700 86px "Readex Pro", sans-serif';
  let y = 380;
  wrap(x, headline, W - 180).slice(0, 3).forEach(l => { x.fillText(l, R, y); y += 108; });
  // divider
  y += 20; x.fillStyle = "rgba(255,255,255,0.18)"; x.fillRect(90, y, W - 180, 2); y += 80;
  x.fillStyle = "#9FB0C0"; x.font = '600 34px "Readex Pro", sans-serif'; x.fillText("كيف تكتشفه", R, y); y += 96;
  x.font = '500 50px "IBM Plex Sans Arabic", sans-serif';
  points.slice(0, 3).forEach(p => {
    x.fillStyle = "#6FCBD3"; x.beginPath(); x.arc(R - 10, y - 13, 9, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#fff";
    wrap(x, p, W - 240).slice(0, 2).forEach(l => { x.fillText(l, R - 46, y); y += 68; });
    y += 40;
  });
  // footer
  x.fillStyle = "rgba(255,255,255,0.08)"; x.fillRect(0, H - 150, W, 150);
  x.fillStyle = "#fff"; x.font = '700 40px "Readex Pro", sans-serif'; x.fillText("رادار أمان", R, H - 64);
  x.textAlign = "left"; x.direction = "ltr"; x.fillStyle = "#9FB0C0"; x.font = '500 30px "IBM Plex Sans Arabic", sans-serif';
  x.fillText("أبلغ عن الإعلان داخل المنصة", 90, H - 66);
  return c.toDataURL("image/jpeg", 0.9);
}
