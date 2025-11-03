// public/sw.js
// Minimal SW to make the app installable. You can expand with caching later.

self.addEventListener("install", (event) => {
  // Skip waiting so updates apply quickly
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Take control of pages immediately
  event.waitUntil(self.clients.claim());
});

// Optional: respond to fetch events here if you want offline caching.
