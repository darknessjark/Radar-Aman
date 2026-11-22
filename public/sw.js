// Receives shares from the Android share sheet and hands them to the checker page.
const SHARE = "radar-share";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method === "POST" && u.pathname === "/share-target") {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const cache = await caches.open(SHARE);
        for (const k of await cache.keys()) await cache.delete(k);
        const files = fd.getAll("images").filter(f => f && f.size).slice(0, 3);
        await Promise.all(files.map((f, i) => cache.put(`/__share/file${i}`, new Response(f, { headers: { "content-type": f.type || "image/jpeg" } }))));
        const meta = { title: fd.get("title") || "", text: fd.get("text") || "", url: fd.get("url") || "", files: files.length };
        await cache.put("/__share/meta", new Response(JSON.stringify(meta), { headers: { "content-type": "application/json" } }));
      } catch (err) {}
      return Response.redirect("/?share=1", 303);
    })());
  }
});
