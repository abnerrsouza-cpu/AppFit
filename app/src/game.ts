// Pontos, níveis, medalhas e missões do dia. Tudo é calculado a partir dos dados da pessoa,
// então não há o que sincronizar à parte e o valor nunca "desanda".
import { t } from './i18n'
import { type AppState, addDays, getProjeto, parseYmd, streak, today, weekStartOf, ymd } from './store'

// ---------- pontos ----------
export const XP = { task: 10, checkin: 50, trained: 20, weekly: 100, photo: 30, promise: 20, goal: 50 }

export function totalXP(s: AppState) {
  let xp = 0
  for (const l of Object.values(s.daily)) xp += XP.checkin + (l.trained === 'sim' ? XP.trained : 0)
  for (const day of Object.values(s.checks)) xp += Math.min(100, Object.values(day).filter(Boolean).length * XP.task)
  for (const w of Object.values(s.weekly)) xp += XP.weekly + (w.photoId ? XP.photo : 0)
  const pj = getProjeto(s)
  xp += pj.promises.filter((p) => p.status === 'cumprida').length * XP.promise
  xp += pj.goals.filter((g) => g.done).length * XP.goal
  return xp
}

const LEVELS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500]
const LEVEL_NAMES = ['Iniciante', 'Em movimento', 'Comprometido', 'Focado', 'Disciplinado', 'Constante', 'Implacável', 'Imparável', 'Lenda', 'Sem Desculpa']

export function levelOf(xp: number) {
  let i = 0
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1]) i++
  const floor = LEVELS[i]
  const next = LEVELS[i + 1] ?? null
  return {
    n: i + 1,
    name: t(LEVEL_NAMES[i]),
    xp,
    floor,
    next,
    pct: next ? (xp - floor) / (next - floor) : 1,
  }
}

/** Maior sequência já feita (dias seguidos com prestação de contas). */
export function bestStreak(s: AppState) {
  const days = Object.keys(s.daily).sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of days) {
    run = prev && ymd(addDays(parseYmd(prev), 1)) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

// ---------- medalhas ----------
export interface Medal {
  id: string
  icon: string
  title: string
  desc: string
  unlocked: boolean
  progress: [number, number]
  tier: 'bronze' | 'prata' | 'ouro'
}

export function medals(s: AppState): Medal[] {
  const best = bestStreak(s)
  const checkins = Object.keys(s.daily).length
  const photos = Object.values(s.weekly).filter((w) => w.photoId).length
  const pj = getProjeto(s)
  const kept = pj.promises.filter((p) => p.status === 'cumprida').length
  const goals = pj.goals.filter((g) => g.done).length
  const plan = s.profile.meals.some((m) => m.items.trim()) && s.profile.workouts.some((w) => w.items.trim())
  const m = (id: string, icon: string, title: string, desc: string, have: number, need: number, tier: Medal['tier']): Medal => ({
    id,
    icon,
    title: t(title),
    desc: t(desc),
    unlocked: have >= need,
    progress: [Math.min(have, need), need],
    tier,
  })
  return [
    m('first', 'list', 'Primeira prestação de contas', 'Responda a prestação de contas da noite pela primeira vez.', checkins, 1, 'bronze'),
    m('s3', 'flame', '3 dias seguidos', 'Preste contas 3 noites seguidas.', best, 3, 'bronze'),
    m('s7', 'flame', '7 dias seguidos', 'Uma semana inteira sem falhar.', best, 7, 'prata'),
    m('s14', 'flame', '14 dias seguidos', 'Duas semanas de constância.', best, 14, 'prata'),
    m('s30', 'flame', '30 dias seguidos', 'Um mês inteiro sem desculpa.', best, 30, 'ouro'),
    m('s60', 'flame', '60 dias seguidos', 'Isso já é quem você é.', best, 60, 'ouro'),
    m('s90', 'flame', '90 dias seguidos', 'O ciclo completo. Sem desculpa.', best, 90, 'ouro'),
    m('photo1', 'camera', 'Primeira foto semanal', 'Envie sua primeira foto no check-in semanal.', photos, 1, 'bronze'),
    m('photo4', 'camera', '4 semanas de fotos', 'Quatro fotos semanais: seu antes e depois ganha vida.', photos, 4, 'prata'),
    m('ref', 'target', 'Referência escolhida', 'Adicione a foto do shape que você quer no Projetinho.', pj.vision.photoId ? 1 : 0, 1, 'bronze'),
    m('plan', 'food', 'Plano completo', 'Cadastre sua dieta e sua ficha de treino.', plan ? 1 : 0, 1, 'bronze'),
    m('letter', 'quote', 'Carta escrita', 'Escreva sua carta de compromisso.', s.profile.letter.trim() ? 1 : 0, 1, 'bronze'),
    m('calendar', 'calendar', 'Agenda conectada', 'Conecte sua agenda nas Integrações.', s.profile.icalUrl ? 1 : 0, 1, 'bronze'),
    m('promise5', 'check', '5 promessas cumpridas', 'Cumpra 5 promessas feitas para você mesmo.', kept, 5, 'prata'),
    m('goal1', 'star', 'Primeira meta batida', 'Bata uma das suas metas do Projetinho.', goals, 1, 'prata'),
  ]
}

/** A próxima medalha de sequência a conquistar (para motivar). */
export function nextStreakMedal(s: AppState) {
  const cur = streak(s)
  const steps = [3, 7, 14, 30, 60, 90]
  const target = steps.find((n) => n > cur)
  return target ? { target, left: target - cur } : null
}

// ---------- missões do dia ----------
export interface Mission {
  id: string
  icon: string
  title: string
  xp: number
  done: boolean
  progress?: [number, number]
  action: 'dia' | 'checkin' | 'semanal' | 'referencia' | 'dieta' | 'carta' | 'integracoes' | 'promessas'
}

/** day: tarefas que aparecem em "Seu dia" (feitas / total, sem contar a prestação de contas). */
export function missions(s: AppState, day?: { done: number; total: number }): Mission[] {
  const key = today()
  const ticks = day ? day.done : Object.values(s.checks[key] || {}).filter(Boolean).length
  const goal = Math.max(1, Math.min(3, day ? day.total : 3))
  const list: Mission[] = [
    { id: 'tasks', icon: 'check', title: goal === 3 ? t('Marque 3 tarefas do seu dia') : goal === 1 ? t('Marque 1 tarefa do seu dia') : t('Marque {n} tarefas do seu dia', { n: goal }), xp: 30, done: ticks >= goal, progress: [Math.min(ticks, goal), goal], action: 'dia' },
    { id: 'checkin', icon: 'list', title: t('Preste contas hoje à noite'), xp: XP.checkin, done: !!s.daily[key], action: 'checkin' },
  ]
  const wk = ymd(weekStartOf(new Date()))
  const dow = new Date().getDay()
  const pj = getProjeto(s)
  if (!s.weekly[wk] && (dow === 0 || dow === 6 || dow === 1 || Object.keys(s.weekly).length === 0))
    list.push({ id: 'weekly', icon: 'camera', title: t('Faça o check-in semanal com foto'), xp: XP.weekly + XP.photo, done: false, action: 'semanal' })
  else if (!pj.vision.photoId) list.push({ id: 'ref', icon: 'target', title: t('Escolha sua foto de referência'), xp: 30, done: false, action: 'referencia' })
  else if (!s.profile.meals.some((m) => m.items.trim())) list.push({ id: 'diet', icon: 'food', title: t('Cadastre o que comer em cada refeição'), xp: 30, done: false, action: 'dieta' })
  else if (!s.profile.icalUrl) list.push({ id: 'cal', icon: 'calendar', title: t('Conecte sua agenda'), xp: 30, done: false, action: 'integracoes' })
  else {
    const open = pj.promises.some((p) => p.status === 'aberta')
    list.push({ id: 'promise', icon: 'star', title: open ? t('Cumpra uma promessa em aberto') : t('Faça uma promessa para amanhã'), xp: XP.promise, done: false, action: 'promessas' })
  }
  return list
}

// ---------- pendências do Projetinho (bolinhas vermelhas e "próximo passo") ----------
export type PjSec = 'expectativa' | 'promessas' | 'metas' | 'desabafo' | 'fotos'
export interface PjStep {
  sec: PjSec
  target: string // id do campo para rolar e focar
  title: string
  why: string
}

export function projetoTodo(s: AppState) {
  const pj = getProjeto(s)
  const v = pj.vision
  const key = today()
  const weekAgo = ymd(addDays(new Date(), -6))
  const vision = [
    !v.photoId && { target: 'pj-vision-photo', title: t('Escolha uma foto do corpo que você quer ter'), why: t('Ela fica no topo do app para você lembrar todo dia aonde quer chegar.') },
    !v.result.trim() && { target: 'pj-result', title: t('Escreva o resultado que você quer'), why: t('Uma frase só. Ex.: perder 8 kg até dezembro.') },
    !v.feeling.trim() && { target: 'pj-feeling', title: t('Escreva como vai se sentir quando chegar lá'), why: t('Pensar nesse dia ajuda a não desistir.') },
    !v.why.trim() && { target: 'pj-why', title: t('Escreva por que isso é importante para você'), why: t('É o seu motivo. Ele segura você nos dias sem vontade.') },
  ].filter(Boolean) as Omit<PjStep, 'sec'>[]
  const late = pj.promises.filter((p) => p.status === 'aberta' && p.date < key)
  const promisedToday = pj.promises.some((p) => p.date === key)
  const overdue = pj.goals.filter((g) => !g.done && g.due && g.due < key).length
  const ventToday = pj.vents.some((x) => x.date === key)
  const photoWeek = pj.photos.some((x) => x.date >= weekAgo)

  const count: Record<PjSec, number> = {
    expectativa: vision.length,
    promessas: late.length + (promisedToday ? 0 : 1),
    metas: pj.goals.length === 0 ? 1 : overdue,
    desabafo: ventToday ? 0 : 1,
    fotos: photoWeek ? 0 : 1,
  }

  // ordem do que fazer primeiro
  const steps: PjStep[] = [
    ...vision.map((x) => ({ ...x, sec: 'expectativa' as PjSec })),
    ...(late.length ? [{ sec: 'promessas' as PjSec, target: `pj-promise-${late[0].id}`, title: t('Você fez uma promessa. Cumpriu?'), why: t('Toque em Cumpri ou Não cumpri. Seja sincero.') }] : []),
    ...(pj.goals.length === 0 ? [{ sec: 'metas' as PjSec, target: 'pj-goal-title', title: t('Crie sua primeira meta'), why: t('Um objetivo com data. Ex.: correr 5 km até o fim do mês.') }] : []),
    ...(!promisedToday ? [{ sec: 'promessas' as PjSec, target: 'pj-new-promise', title: t('Faça uma promessa para amanhã'), why: t('Uma coisa pequena que você vai cumprir. Amanhã você volta e marca se cumpriu.') }] : []),
    ...(!ventToday ? [{ sec: 'desabafo' as PjSec, target: 'pj-vent', title: t('Conte como foi seu dia'), why: t('Escolha como você está e escreva um pouco. Só você lê.') }] : []),
    ...(!photoWeek ? [{ sec: 'fotos' as PjSec, target: 'pj-gallery', title: t('Guarde uma foto da semana'), why: t('Pode ser do treino, do prato ou do espelho.') }] : []),
  ]
  const total = Object.values(count).reduce((a, b) => a + b, 0)
  return { count, steps, total, visionDone: 4 - vision.length }
}

// ---------- andamento do projetinho ----------
export function projetoStats(s: AppState) {
  const pj = getProjeto(s)
  const p = s.profile
  const key = today()
  const start = pj.startedAt ? ymd(new Date(pj.startedAt)) : p.startDate
  const startD = parseYmd(start)
  const target = parseYmd(pj.vision.targetDate)
  const dayMs = 86400000
  const total = Math.max(1, Math.round((target.getTime() - startD.getTime()) / dayMs))
  const elapsed = Math.max(1, Math.min(total, Math.round((parseYmd(key).getTime() - startD.getTime()) / dayMs) + 1))
  const left = Math.max(0, total - elapsed + 1)

  // dias já "fechados": de start até ontem, mais hoje se já prestou contas
  const days: string[] = []
  for (let d = startD; ymd(d) < key; d = addDays(d, 1)) days.push(ymd(d))
  if (s.daily[key]) days.push(key)
  const logs = days.map((d) => s.daily[d]).filter(Boolean)

  const constancy = days.length ? logs.length / days.length : null
  const planned = days.filter((d) => p.workouts.some((w) => w.weekday === parseYmd(d).getDay()))
  const trainScore = planned.length
    ? planned.reduce((acc, d) => {
        const l = s.daily[d]
        return acc + (!l ? 0 : l.trained === 'sim' ? 1 : l.trained === 'parcial' ? 0.5 : 0)
      }, 0) / planned.length
    : null
  const diet = logs.length ? logs.reduce((a, l) => a + (l.dietScore || 0), 0) / logs.length / 10 : null
  const kept = pj.promises.filter((x) => x.status === 'cumprida').length
  const broken = pj.promises.filter((x) => x.status === 'quebrada').length
  const promises = kept + broken ? kept / (kept + broken) : null

  const parts = [constancy, trainScore, diet, promises].filter((x): x is number => x !== null)
  const efficacy = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null

  // ritmo do peso: quanto do caminho já foi feito x quanto do tempo já passou
  const ws = Object.values(s.weekly).sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const cur = ws.length ? ws[ws.length - 1].weight : p.weightStart
  const way = p.weightStart - p.weightGoal
  const weightPct = way ? Math.max(0, Math.min(1, (p.weightStart - cur) / way)) : null
  const timePct = elapsed / total

  return { start, total, elapsed, left, timePct, constancy, trainScore, diet, promises, kept, broken, efficacy, weightPct, cur, logs: logs.length, closed: days.length }
}

export function efficacyLabel(v: number) {
  if (v >= 0.8) return t('Excelente. Continue assim.')
  if (v >= 0.6) return t('Bom, mas dá para apertar.')
  if (v >= 0.4) return t('Abaixo do necessário.')
  return t('Você está se sabotando.')
}
