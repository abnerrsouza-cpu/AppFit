// Notificações no celular.
// MVP: com o app instalado (PWA), dispara as cobranças nos horários da rotina enquanto
// o app estiver aberto ou em segundo plano recente.
// Produção: o servidor envia Web Push (VAPID) pelo mesmo cronograma, com o app fechado.
import { dailySchedule, nudge } from './psych'
import { t } from './i18n'
import { defaultCustom, getState, today } from './store'

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
    if (r === 'granted') await show(t('Cobrança ativada'), t('A partir de agora eu vou te cobrar o dia inteiro. Você pediu por isso.'))
    return r as NotifyStatus
  } catch {
    return 'denied'
  }
}

export async function show(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  const opts: NotificationOptions = { body, icon: './icon-192.png', badge: './icon-192.png', tag: `${title}-${Date.now()}` }
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
    testTick()
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
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tick())
  return window.setInterval(tick, 30_000)
}

// ---------- modo teste: dispara a cada N minutos, alternando frases ----------
const LAST_TEST = 'semdesculpa:lastTest'
let testIdx = 0

export function testMessages() {
  const s = getState()
  const mine = (s.custom ?? defaultCustom()).filter((c) => c.on && c.text.trim()).map((c) => ({ title: t('Recado seu'), body: c.text }))
  const app = (['treino', 'checkin', 'geral', 'checkin_atrasado', 'acordar'] as const).map((m, i) => ({
    title: 'Sem Desculpa',
    body: nudge(s, m, { treino: t('Seu treino de hoje'), hora: new Date().toTimeString().slice(0, 5) }, i * 7 + Date.now()),
  }))
  // intercala: frase sua, frase do app, frase sua...
  const out: { title: string; body: string }[] = []
  for (let i = 0; i < Math.max(mine.length, app.length); i++) {
    if (mine.length) out.push(mine[i % mine.length])
    out.push(app[i % app.length])
  }
  return out
}

export function fireTestNow() {
  const list = testMessages()
  const m = list[testIdx++ % list.length]
  try {
    localStorage.setItem(LAST_TEST, String(Date.now()))
  } catch {
    /* ignora */
  }
  return show(m.title, m.body)
}

function testTick() {
  const every = getState().testEvery || 0
  if (!every) return
  let last = 0
  try {
    last = Number(localStorage.getItem(LAST_TEST) || 0)
  } catch {
    /* ignora */
  }
  if (Date.now() - last >= every * 60_000 - 5_000) void fireTestNow()
}
