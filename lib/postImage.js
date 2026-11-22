// Draws the Instagram warning image in the browser (the browser shapes Arabic text correctly).
const W = 1080, H = 1350;
function wrap(ctx, text, maxW) {
  const words = String(text || "").split(/\s+/).filter(Boolean), lines = [];
  let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
const loadImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
// Fits the warning points into a column: tries big text first and shrinks until everything fits the height.
function fitPoints(x, points, width, maxH) {
  const list = points.filter(Boolean);
  for (const size of [44, 40, 36, 32, 28]) {
    x.font = `500 ${size}px "IBM Plex Sans Arabic", sans-serif`;
    const lh = Math.round(size * 1.38), gap = Math.round(size * 0.6);
    const blocks = list.map(p => wrap(x, p, width - 40).slice(0, 4));
    const h = blocks.reduce((a, b) => a + b.length * lh + gap, 0);
    if (h <= maxH || size === 28) return { size, lh, gap, blocks };
  }
}
function drawPoints(x, fit, R, y, width) {
  x.font = `500 ${fit.size}px "IBM Plex Sans Arabic", sans-serif`;
  fit.blocks.forEach(lines => {
    x.fillStyle = "#8DB8F2"; x.beginPath(); x.arc(R - 10, y - fit.size * 0.32, 8, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#fff";
    lines.forEach(l => { x.fillText(l, R - 40, y); y += fit.lh; });
    y += fit.gap;
  });
  return y;
}
// Burns the cover boxes into the picture itself, so nothing hidden can be recovered from the posted file.
function coverBoxes(im, boxes) {
  const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext("2d"); x.drawImage(im, 0, 0);
  x.fillStyle = "#0B1426";
  (boxes || []).forEach(b => x.fillRect(Math.floor(b.x * c.width), Math.floor(b.y * c.height), Math.ceil(b.w * c.width) + 1, Math.ceil(b.h * c.height) + 1));
  return c;
}
// Cover first (boxes are fractions of the full picture), then cut away the unimportant margins.
function cropTo(full, crop) {
  if (!crop) return full;
  const sx = Math.round(crop.x * full.width), sy = Math.round(crop.y * full.height);
  const sw = Math.max(1, Math.round(crop.w * full.width)), sh = Math.max(1, Math.round(crop.h * full.height));
  const c = document.createElement("canvas"); c.width = sw; c.height = sh;
  c.getContext("2d").drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh);
  return c;
}
async function renderShotPost({ headline, points, scamType, shot, boxes, crop }) {
  const im = await loadImg(shot);
  const src = cropTo(coverBoxes(im, boxes), crop);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#0A2A5E"; x.fillRect(0, 0, W, H);
  x.save(); x.strokeStyle = "rgba(141,184,242,0.12)"; x.lineWidth = 2;
  [160, 290, 420, 550].forEach(r => { x.beginPath(); x.arc(120, 1260, r, 0, Math.PI * 2); x.stroke(); });
  x.restore();
  x.direction = "rtl"; x.textAlign = "right";
  const R = W - 80;
  // badge + type
  x.fillStyle = "#C62828"; x.beginPath(); x.roundRect(R - 230, 64, 230, 58, 29); x.fill();
  x.fillStyle = "#fff"; x.font = '600 31px "Readex Pro", sans-serif'; x.textAlign = "center"; x.fillText("تحذير احتيال", R - 115, 104);
  x.textAlign = "right";
  if (scamType) { x.fillStyle = "#8DB8F2"; x.font = '500 30px "IBM Plex Sans Arabic", sans-serif'; x.textAlign = "left"; x.fillText(scamType, 80, 104); x.textAlign = "right"; }
  // headline (max 2 lines)
  x.fillStyle = "#fff"; x.font = '700 70px "Readex Pro", sans-serif';
  let y = 215;
  wrap(x, headline, W - 160).slice(0, 2).forEach(l => { x.fillText(l, R, y); y += 88; });
  const top = y + 20, bottom = H - 190, areaH = bottom - top;
  const ratio = src.height / src.width;
  const drawShot = (dx, dy, dw, dh) => {
    x.save(); x.shadowColor = "rgba(0,0,0,0.45)"; x.shadowBlur = 30; x.shadowOffsetY = 10;
    x.fillStyle = "#fff"; x.beginPath(); x.roundRect(dx - 6, dy - 6, dw + 12, dh + 12, 22); x.fill(); x.restore();
    x.save(); x.beginPath(); x.roundRect(dx, dy, dw, dh, 16); x.clip(); x.drawImage(src, dx, dy, dw, dh); x.restore();
  };
  const note = (nx, ny, align) => { x.save(); x.textAlign = align; x.direction = "rtl"; x.fillStyle = "#B4C6E2"; x.font = '500 26px "IBM Plex Sans Arabic", sans-serif'; x.fillText("لقطة من الحالة المرصودة، وتم إخفاء البيانات الخاصة", nx, ny); x.restore(); };
  if (ratio > 1.05) {
    // tall screenshot (phone): picture on the left, warning signs on the right
    const maxW = 460;
    let dh = areaH - 50, dw = dh / ratio;
    if (dw > maxW) { dw = maxW; dh = dw * ratio; }
    const dx = 86, dy = top + 6;
    drawShot(dx, dy, dw, dh);
    const colL = dx + dw + 56, colW = R - colL;
    x.fillStyle = "#B4C6E2"; x.font = '600 32px "Readex Pro", sans-serif'; x.fillText("كيف تكتشفه", R, top + 50);
    const fit = fitPoints(x, points, colW, areaH - 190);
    drawPoints(x, fit, R, top + 120, colW);
    note(R, bottom - 2, "right");
  } else {
    // wide screenshot: picture on top, warning signs underneath
    const maxH = Math.min(areaH * 0.5, 460);
    let dw = W - 200, dh = dw * ratio;
    if (dh > maxH) { dh = maxH; dw = dh / ratio; }
    const dx = (W - dw) / 2, dy = top + 6;
    drawShot(dx, dy, dw, dh);
    note(W / 2, dy + dh + 46, "center");
    x.textAlign = "right";
    const y2 = dy + dh + 110;
    x.fillStyle = "#B4C6E2"; x.font = '600 32px "Readex Pro", sans-serif'; x.fillText("كيف تكتشفه", R, y2);
    const fit = fitPoints(x, points, R - 80, bottom - y2 - 30);
    drawPoints(x, fit, R, y2 + 62, R - 80);
  }
  footer(x, R);
  return c.toDataURL("image/jpeg", 0.9);
}
function footer(x, R) {
  x.textAlign = "right"; x.direction = "rtl";
  x.fillStyle = "rgba(255,255,255,0.08)"; x.fillRect(0, H - 150, W, 150);
  x.fillStyle = "#fff"; x.font = '700 40px "Readex Pro", sans-serif'; x.fillText("رادار أمان", R, H - 64);
  x.textAlign = "left"; x.direction = "ltr"; x.fillStyle = "#B4C6E2"; x.font = '500 30px "IBM Plex Sans Arabic", sans-serif';
  x.fillText("أبلغ عن الإعلان داخل المنصة", 80, H - 66);
}
export async function renderPostImage({ headline, points = [], scamType, shot, boxes, crop }) {
  if (shot) {
    try { await Promise.all(['700 70px "Readex Pro"', '600 32px "Readex Pro"', '500 36px "IBM Plex Sans Arabic"'].map(f => document.fonts.load(f, "رادار"))); } catch {}
    return renderShotPost({ headline, points, scamType, shot, boxes, crop });
  }
  try { await Promise.all(['700 80px "Readex Pro"', '600 40px "Readex Pro"', '500 38px "IBM Plex Sans Arabic"'].map(f => document.fonts.load(f, "رادار"))); } catch {}
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#0A2A5E"; x.fillRect(0, 0, W, H);
  // radar rings
  x.save(); x.strokeStyle = "rgba(141,184,242,0.12)"; x.lineWidth = 2;
  [160, 290, 420, 550].forEach(r => { x.beginPath(); x.arc(120, 1230, r, 0, Math.PI * 2); x.stroke(); });
  x.beginPath(); x.moveTo(120, 1230); x.lineTo(560, 790); x.stroke(); x.restore();
  x.direction = "rtl"; x.textAlign = "right";
  const R = W - 90;
  // label
  x.fillStyle = "#C62828"; x.beginPath(); x.roundRect(R - 250, 96, 250, 64, 32); x.fill();
  x.fillStyle = "#fff"; x.font = '600 34px "Readex Pro", sans-serif'; x.textAlign = "center"; x.fillText("تحذير احتيال", R - 125, 140);
  x.textAlign = "right";
  if (scamType) { x.fillStyle = "#8DB8F2"; x.font = '500 34px "IBM Plex Sans Arabic", sans-serif'; x.fillText(scamType, R, 232); }
  // headline
  x.fillStyle = "#fff"; x.font = '700 86px "Readex Pro", sans-serif';
  let y = 380;
  wrap(x, headline, W - 180).slice(0, 3).forEach(l => { x.fillText(l, R, y); y += 108; });
  // divider
  y += 20; x.fillStyle = "rgba(255,255,255,0.18)"; x.fillRect(90, y, W - 180, 2); y += 80;
  x.fillStyle = "#B4C6E2"; x.font = '600 34px "Readex Pro", sans-serif'; x.fillText("كيف تكتشفه", R, y); y += 96;
  x.font = '500 50px "IBM Plex Sans Arabic", sans-serif';
  points.slice(0, 3).forEach(p => {
    x.fillStyle = "#8DB8F2"; x.beginPath(); x.arc(R - 10, y - 13, 9, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#fff";
    wrap(x, p, W - 240).slice(0, 2).forEach(l => { x.fillText(l, R - 46, y); y += 68; });
    y += 40;
  });
  // footer
  x.fillStyle = "rgba(255,255,255,0.08)"; x.fillRect(0, H - 150, W, 150);
  x.fillStyle = "#fff"; x.font = '700 40px "Readex Pro", sans-serif'; x.fillText("رادار أمان", R, H - 64);
  x.textAlign = "left"; x.direction = "ltr"; x.fillStyle = "#B4C6E2"; x.font = '500 30px "IBM Plex Sans Arabic", sans-serif';
  x.fillText("أبلغ عن الإعلان داخل المنصة", 90, H - 66);
  return c.toDataURL("image/jpeg", 0.9);
}
