
// Optional: respond to fetch events here if you want offline caching.
// public/sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* pass-through; hook is enough for installability */ });
