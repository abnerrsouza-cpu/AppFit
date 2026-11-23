// Lê a agenda pública/secreta (formato iCal .ics) de Google, iCloud ou Outlook e devolve
// os compromissos dos próximos dias. Só aceita endereços desses serviços (segurança).
import * as ical from 'node-ical'

const ALLOWED = [/^calendar\.google\.com$/, /(^|\.)icloud\.com$/, /^outlook\.(live|office365)\.com$/, /^outlook\.office\.com$/]

export function normalizeUrl(raw) {
  let s = String(raw || '').trim()
  if (s.startsWith('webcal://')) s = 'https://' + s.slice('webcal://'.length)
  let u
  try {
    u = new URL(s)
  } catch {
    throw new Error('Esse link não parece um endereço de agenda. Copie o link completo.')
  }
  if (u.protocol !== 'https:') throw new Error('O link da agenda precisa começar com https:// ou webcal://')
  if (!ALLOWED.some((re) => re.test(u.hostname))) throw new Error('Use o link da agenda do Google, do iPhone (iCloud) ou do Outlook.')
  return u.toString()
}

const cache = new Map() // url -> { at, events }

async function download(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'text/calendar, */*' } })
    if (r.status === 404 || r.status === 403) throw new Error('A agenda não está pública ou o link mudou. Gere o link de novo.')
    if (!r.ok) throw new Error('Não consegui ler a agenda agora. Tente de novo em alguns minutos.')
    const text = await r.text()
    if (text.length > 5_000_000) throw new Error('A agenda é grande demais.')
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Esse link não é de uma agenda. Confira se copiou o endereço iCal.')
    return text
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('A agenda demorou demais para responder.')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

/** Compromissos de hoje até `days` dias à frente. */
export async function eventsFor(rawUrl, days = 7) {
  const url = normalizeUrl(rawUrl)
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < 15 * 60_000) return hit.events
  const data = ical.sync.parseICS(await download(url))
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from.getTime() + days * 86400_000)
  const out = []
  for (const ev of Object.values(data)) {
    if (!ev || ev.type !== 'VEVENT' || !ev.start) continue
    let instances = []
    try {
      instances = ical.expandRecurringEvent(ev, { from, to, maxIterations: 2000 })
    } catch {
      continue
    }
    for (const inst of instances) {
      const title = String((inst.summary && (inst.summary.val ?? inst.summary)) || ev.summary || 'Compromisso').slice(0, 120)
      out.push({
        uid: `${ev.uid || title}-${new Date(inst.start).toISOString()}`,
        title,
        start: new Date(inst.start).toISOString(),
        end: inst.end ? new Date(inst.end).toISOString() : null,
        allDay: !!inst.isFullDay,
      })
    }
  }
  out.sort((a, b) => a.start.localeCompare(b.start))
  const events = out.slice(0, 300)
  cache.set(url, { at: Date.now(), events })
  return events
}
