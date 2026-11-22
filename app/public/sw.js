// Service worker: guarda o app para abrir offline e recebe as notificações push.
const CACHE = 'semdesculpa-v1'
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])).catch(() => {}))
  self.skipWaiting()
})
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copy = r.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
        return r
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  )
})
// Push vindo do servidor (fase 2)
self.addEventListener('push', (e) => {
  const d = e.data ? e.data.json() : { title: 'Sem Desculpa', body: 'Hora de prestar contas.' }
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: 'icon-192.png', badge: 'icon-192.png' }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow('./')))
  )
})
