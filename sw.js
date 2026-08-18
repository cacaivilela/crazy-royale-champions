// Service worker do Crazy Royale Champions.
// Estratégia: cache-first para o jogo, NETWORK-FIRST para content/ —
// senão o live update nunca veria um patch novo.
const CACHE = 'crc-v2'
const ESSENCIAIS = [
  './',
  './index.html',
  './src/style.css',
  './src/main.js',
  './vendor/three.module.js',
  './public/manifest.webmanifest',
  './public/icon.svg'
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESSENCIAIS)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return

  // patch/live update: sempre tenta a rede primeiro
  if (url.pathname.includes('/content/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)))
    return
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copia = res.clone()
      caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {})
      return res
    }).catch(() => hit))
  )
})
