// Notificações no celular.
// MVP: com o app instalado (PWA), dispara as cobranças nos horários da rotina enquanto
// o app estiver aberto ou em segundo plano recente.
// Produção: o servidor envia Web Push (VAPID) pelo mesmo cronograma, com o app fechado.
import { dailySchedule } from './psych'
import { getState, today } from './store'

export type NotifyStatus = 'unsupported' | 'denied' | 'granted' | 'default' | 'needs-install'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true

export function notifyStatus(): NotifyStatus {
  if (!('Notification' in window)) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  return Notification.permission as NotifyStatus
}

let reg: ServiceWorkerRegistration | null = null

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return
  try {
    reg = await navigator.serviceWorker.register('./sw.js')
  } catch {
    reg = null
  }
}

export async function enableNotifications(): Promise<NotifyStatus> {
  if (!('Notification' in window)) return notifyStatus()
  try {
    const r = await Notification.requestPermission()
    if (r === 'granted') await show('Cobrança ativada', 'A partir de agora eu vou te cobrar o dia inteiro. Você pediu por isso.')
    return r as NotifyStatus
  } catch {
    return 'denied'
  }
}

export async function show(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  const opts: NotificationOptions = { body, icon: './icon-192.png', badge: './icon-192.png', tag: title }
  try {
    if (reg) await reg.showNotification(title, opts)
    else new Notification(title, opts)
    return true
  } catch {
    return false
  }
}

const FIRED = 'semdesculpa:fired'

/** Confere a cada minuto se alguma cobrança do dia venceu e ainda não foi enviada. */
export function startScheduler() {
  const tick = () => {
    const s = getState()
    if (!s.onboarded) return
    const now = new Date()
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    let fired: Record<string, string[]> = {}
    try {
      fired = JSON.parse(localStorage.getItem(FIRED) || '{}')
    } catch {
      /* ignora */
    }
    const key = today()
    const done = new Set(fired[key] || [])
    for (const n of dailySchedule(s)) {
      const id = `${n.moment}@${n.time}`
      if (n.time > hhmm || done.has(id)) continue
      // só dispara o que venceu nos últimos 10 minutos, para não despejar tudo ao abrir
      const [h, m] = n.time.split(':').map(Number)
      const diff = now.getHours() * 60 + now.getMinutes() - (h * 60 + m)
      done.add(id)
      if (diff > 10) continue
      if ((n.moment === 'checkin' || n.moment === 'checkin_atrasado') && s.daily[key]) continue
      void show(n.title, n.body)
    }
    try {
      localStorage.setItem(FIRED, JSON.stringify({ [key]: [...done] }))
    } catch {
      /* ignora */
    }
  }
  tick()
  return window.setInterval(tick, 60_000)
}
