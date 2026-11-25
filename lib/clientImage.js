// Browser-only helpers: shrink images, make a thumbnail and a perceptual hash, read any QR code.
import jsQR from "jsqr";
function load(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = fr.result; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
function draw(im, max) {
  const r = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(im.naturalWidth * r)); c.height = Math.max(1, Math.round(im.naturalHeight * r));
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
  return c;
}
function dhash(im) {
  const c = document.createElement("canvas"); c.width = 9; c.height = 8;
  const x = c.getContext("2d"); x.drawImage(im, 0, 0, 9, 8);
  const d = x.getImageData(0, 0, 9, 8).data; let bits = "";
  const g = p => d[p] * .299 + d[p + 1] * .587 + d[p + 2] * .114;
  for (let y = 0; y < 8; y++) for (let i = 0; i < 8; i++) { const p = (y * 9 + i) * 4; bits += g(p) > g(p + 4) ? "1" : "0"; }
  return bits;
}
// QR codes in screenshots (fake parking fines, "scan to pay" posters) hide a link: read it so it gets checked too.
function readQR(im) {
  try {
    for (const max of [1200, 800]) {
      const c = draw(im, max), d = c.getContext("2d").getImageData(0, 0, c.width, c.height);
      const q = jsQR(d.data, c.width, c.height, { inversionAttempts: "attemptBoth" });
      if (q?.data) return q.data.slice(0, 500);
    }
  } catch {}
  return null;
}
export async function prepareImage(file) {
  const im = await load(file);
  return { qr: readQR(im), full: draw(im, 1500).toDataURL("image/jpeg", 0.85), thumb: draw(im, 360).toDataURL("image/jpeg", 0.7), post: draw(im, 1000).toDataURL("image/jpeg", 0.8), hash: dhash(im) };
}
