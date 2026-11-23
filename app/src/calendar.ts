// Compromissos da agenda da pessoa (lidos pelo servidor a partir do link iCal dela).
import { type CalEvent, api } from './api'
import { isServerMode } from './notify'

let events: CalEvent[] = []
let error = ''
let loadedAt = 0
const listeners = new Set<() => void>()

export const getEvents = () => events
export const getCalendarError = () => error

export function onEvents(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Busca de novo no servidor (no máximo a cada 10 min, a não ser que force). */
export async function refreshEvents(force = false) {
  if (!isServerMode()) return
  if (!force && Date.now() - loadedAt < 10 * 60_000) return
  try {
    const r = await api.calendar()
    events = r.events
    error = r.error || ''
    loadedAt = Date.now()
    listeners.forEach((l) => l())
  } catch {
    /* sem conexão */
  }
}

export const hhmmOf = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export const ymdOf = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
