// Service worker: guarda o app para abrir offline e recebe as notificações push.
const CACHE = 'semdesculpa-v3'
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
  e.waitUntil(self.registration.showNotification(d.title ?? '', { body: d.body, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' } }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((cs) => {
      const url = (e.notification.data && e.notification.data.url) || './'
      // app aberto: leva para a tela certa; fechado: abre já nela
      if (cs[0]) return cs[0].focus().then((c) => c.navigate(url).catch(() => c))
      return self.clients.openWindow(url)
    })
  )
})
