// Controle de água: cada gole marcado vira um registro com horário e recipiente.
import { t } from './i18n'
import { type AppState, currentWeight, setState, today } from './store'
import { toast } from './components/Toast'

export interface WaterEntry {
  at: string // HH:MM
  ml: number
  kind: string // copo | caneca | garrafinha | garrafa | outro
}

export const CONTAINERS = [
  { kind: 'copo', ml: 200, label: 'Copo' },
  { kind: 'caneca', ml: 300, label: 'Caneca' },
  { kind: 'garrafinha', ml: 500, label: 'Garrafinha' },
  { kind: 'garrafa', ml: 1000, label: 'Garrafa' },
] as const

export const waterGoal = (s: AppState) => s.profile.waterGoalMl || Math.max(1500, Math.round((currentWeight(s) * 35) / 500) * 500)
export const fmtL = (ml: number) => (ml / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })

/** Registros do dia; dias antigos que só têm total viram um registro único. */
export function waterLog(s: AppState, day = today()): WaterEntry[] {
  const log = s.waterLog?.[day]
  if (log) return log
  const total = s.water?.[day]
  return total ? [{ at: '--:--', ml: total, kind: 'outro' }] : []
}
export const waterTotal = (s: AppState, day = today()) => waterLog(s, day).reduce((a, e) => a + e.ml, 0)

function save(day: string, log: WaterEntry[], goal: number) {
  const total = log.reduce((a, e) => a + e.ml, 0)
  setState((x) => ({
    ...x,
    waterLog: { ...(x.waterLog || {}), [day]: log },
    water: { ...(x.water || {}), [day]: total },
    checks: { ...x.checks, [day]: { ...(x.checks[day] || {}), water: total >= goal } },
  }))
}

export function drink(s: AppState, ml: number, kind: string) {
  const day = today()
  const before = waterTotal(s, day)
  const goal = waterGoal(s)
  const now = new Date()
  const at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  save(day, [...waterLog(s, day), { at, ml, kind }], goal)
  if (before < goal && before + ml >= goal) toast(t('Meta de água batida'), t('Seu corpo agradece.'))
  else toast(t('+{n} ml registrados', { n: ml }), t('{a} L de {b} L hoje', { a: fmtL(before + ml), b: fmtL(goal) }))
}

export function undrink(s: AppState, index: number) {
  const day = today()
  const log = waterLog(s, day).filter((_, i) => i !== index)
  save(day, log, waterGoal(s))
}
