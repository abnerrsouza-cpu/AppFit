// Modo foco: em dia de treino ainda não feito, o app esconde o resto e puxa a pessoa para treinar.
import { type AppState, hasTrainPlan, today, workoutFor } from './store'

export function trainLocked(s: AppState) {
  if (!s.onboarded || s.demo) return false
  const p = s.profile
  const hasPlan = hasTrainPlan(p)
  if (hasPlan && !workoutFor(p, new Date())) return false // dia de descanso
  const c = s.checks[today()] || {}
  const log = s.daily[today()]
  if (c.train || c.gym || log) return false
  return true
}
