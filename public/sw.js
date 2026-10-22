// Minimal service worker: makes the app installable (Android "Install app" prompt).
// No caching, so users always get the latest version. Page loads go to the network;
// when offline they get a short Hebrew notice instead of the browser's error page.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body dir="rtl" style="background:#0F0E0C;color:#eee;font-family:system-ui;padding:40px;text-align:center">אין חיבור לאינטרנט. נסו שוב בעוד רגע.</body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
})
