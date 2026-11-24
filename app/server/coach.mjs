// Motor das notificações: 3 por período (manhã, tarde, noite), montadas NA HORA do envio
// com os dados do momento: horário x metas x desempenho x dados da pessoa.
// Regra: o título é a própria mensagem; o texto de baixo traz o dado que justifica abrir o app.
import { getSetting, q } from './db.mjs'
import { sendToUser } from './push.mjs'

// ---------- tempo ----------
function localNow(tz) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date())
  const g = (k) => p.find((x) => x.type === k)?.value
  return { date: `${g('year')}-${g('month')}-${g('day')}`, min: Number(g('hour')) * 60 + Number(g('minute')), dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')) }
}
const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const addDays = (ymd, n) => {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const dowOf = (ymd) => new Date(ymd + 'T12:00:00Z').getUTCDay()
const mondayOf = (ymd) => addDays(ymd, -((dowOf(ymd) + 6) % 7))
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000)
const cut = (s, n) => {
  const x = String(s || '').replace(/\s+/g, ' ').trim()
  return x.length > n ? x.slice(0, n - 1).trimEnd() + '…' : x
}
const firstLine = (s) => String(s || '').split(/\n|,\s+/).map((x) => x.trim()).filter(Boolean).slice(0, 2).join(', ')

// ---------- textos (pt / en / es) ----------
const T = {
  pt: {
    day: (x, n) => `Dia ${x} de ${n}`,
    wakeRestart: 'Ontem não contou. Hoje recomeça.',
    wakeTrain: (x, n, w, h) => `Dia ${x} de ${n}: ${w} às ${h}`,
    wakeRest: (x, n) => `Dia ${x} de ${n}: dia de descanso`,
    wakeBody: (s, what, h) => (s > 0 ? `Sequência de ${s} ${s === 1 ? 'dia' : 'dias'}. ` : '') + (what ? `Primeiro passo: ${what} às ${h}.` : 'Abra e veja o seu dia.'),
    meal: (h, name) => `${h} · ${name}`,
    mealBody: (items, done, total, missed) => `${items ? items + '. ' : ''}${missed ? `Ainda sem marcar: ${missed}.` : `${done} de ${total} refeições feitas hoje.`}`,
    task: (h, x) => `${h} · ${x}`,
    taskBody: (done, total) => (total === 1 ? 'Fez? Marque no app para contar no seu dia.' : `${done} de ${total} afazeres de hoje feitos. Marque no app.`),
    custom: 'Recado que você mesmo escreveu.',
    train: (w, h) => `Treino em 1h: ${w} às ${h}`,
    trainBody: (n, done, planned) => `${n ? `${n} exercícios. ` : ''}Semana: ${done} de ${planned} treinos feitos.`,
    checkin: 'Preste contas: leva 1 minuto',
    checkinBody: (md, mt, tr, s) => `Hoje: ${md} de ${mt} refeições, treino ${tr}. ${s > 0 ? `Sequência de ${s} dias em jogo.` : 'Faça o dia contar.'}`,
    trDone: 'feito',
    trPending: 'pendente',
    trRest: 'de descanso',
    late: (h) => (h <= 1 ? 'Falta 1h para hoje não contar' : `Faltam ${h}h para hoje não contar`),
    lateBodyStreak: (s) => `Sem prestação de contas, a sequência de ${s} ${s === 1 ? 'dia' : 'dias'} zera.`,
    lateBodyZero: (x) => `O dia ${x} ainda está em branco. 1 minuto e ele conta.`,
    weekly: 'Hoje é dia da foto semanal',
    weeklyBody: (w, left, goal) => `Última pesagem: ${w} kg. Faltam ${left} kg para ${goal} kg.`,
    missed: (names) => `Você ainda não marcou: ${names}`,
    missedBody: (d, t) => `${d} de ${t} refeições marcadas. Marque o que comeu para a dieta contar.`,
    promise: (x) => `Você prometeu: "${x}"`,
    promiseBody: 'Já cumpriu? Marque no Projetinho.',
    cardio: (x) => `Faltam ${x} min de cardio na semana`,
    cardioBody: (d, g, days) => `${d} de ${g} min até agora. ${days <= 1 ? 'Resta hoje.' : `Restam ${days} dias.`}`,
    trainWeek: (d, p) => `${d} de ${p} treinos na semana`,
    trainWeekBody: (w, h) => (w ? `Hoje tem ${w} às ${h}. Não deixe a semana escapar.` : 'Ainda dá tempo de fechar a semana.'),
    pace: (kg, days) => `Faltam ${kg} kg e ${days} dias`,
    paceBody: (pw, r) => `Isso dá ${pw} kg por semana${r ? ` para "${r}"` : ''}.`,
    letter: (c) => `Você escreveu: "${c}"`,
    letterBody: (x, n) => `Dia ${x} de ${n}. Não deixe virar mais uma tentativa.`,
    ask: 'Que horas você vai treinar hoje?',
    askBody: (s) => (s >= 7 ? `Não achei no seu dia. São ${s} dias seguidos: não deixa o dia passar sem horário.` : 'Não achei no seu dia. Toque e me diga um horário.'),
    chaseAsk: 'Ainda não sei que horas você vai treinar',
    chaseAskBody: (s) => (s >= 7 ? `Você não chegou em ${s} dias seguidos deixando para depois. Escolhe um horário.` : 'Me diz um horário e eu te ajudo a chegar lá.'),
    chaseLate: (s) => (s >= 7 ? `${s} dias seguidos. Vai entregar isso hoje?` : 'Já está ficando tarde... vai perder mais um dia?'),
    chaseLateBody: (s) => (s >= 7 ? 'Quem chegou até aqui não para por preguiça. Abre e me diz o que está pegando.' : 'Abre o app e me conta o que está te travando. A gente resolve.'),
    chase5: 'Pensa só nos próximos 5 minutos',
    chase5Body: 'Pensa só nos próximos 5 minutos: se arruma e sai de casa. O resto vem depois.',
    chaseMission: 'Missão de hoje: chegar na academia',
    chaseMissionBody: (s) => (s >= 7 ? 'Só chegar. Não precisa ser o melhor treino. Precisa existir.' : 'Só chegar já conta. 20 minutos e o dia é seu.'),
    chaseWas: (h) => `Era às ${h}. Já saiu de casa?`,
    chaseWasBody: 'Ainda dá tempo. Abre e me diz se você está a caminho.',
  },
  en: {
    day: (x, n) => `Day ${x} of ${n}`,
    wakeRestart: "Yesterday didn't count. Today starts over.",
    wakeTrain: (x, n, w, h) => `Day ${x} of ${n}: ${w} at ${h}`,
    wakeRest: (x, n) => `Day ${x} of ${n}: rest day`,
    wakeBody: (s, what, h) => (s > 0 ? `${s}-day streak. ` : '') + (what ? `First step: ${what} at ${h}.` : 'Open and see your day.'),
    meal: (h, name) => `${h} · ${name}`,
    mealBody: (items, done, total, missed) => `${items ? items + '. ' : ''}${missed ? `Still unchecked: ${missed}.` : `${done} of ${total} meals done today.`}`,
    task: (h, x) => `${h} · ${x}`,
    taskBody: (done, total) => (total === 1 ? 'Done? Check it in the app so it counts.' : `${done} of ${total} tasks done today. Check it in the app.`),
    custom: 'A note you wrote yourself.',
    train: (w, h) => `Workout in 1h: ${w} at ${h}`,
    trainBody: (n, done, planned) => `${n ? `${n} exercises. ` : ''}Week: ${done} of ${planned} workouts done.`,
    checkin: 'Report in: takes 1 minute',
    checkinBody: (md, mt, tr, s) => `Today: ${md} of ${mt} meals, workout ${tr}. ${s > 0 ? `${s}-day streak on the line.` : 'Make the day count.'}`,
    trDone: 'done',
    trPending: 'pending',
    trRest: 'off',
    late: (h) => (h <= 1 ? '1h left before today stops counting' : `${h}h left before today stops counting`),
    lateBodyStreak: (s) => `No report and your ${s}-day streak resets.`,
    lateBodyZero: (x) => `Day ${x} is still blank. 1 minute and it counts.`,
    weekly: 'Today is weekly photo day',
    weeklyBody: (w, left, goal) => `Last weigh-in: ${w} kg. ${left} kg to go to ${goal} kg.`,
    missed: (names) => `You haven't checked: ${names}`,
    missedBody: (d, t) => `${d} of ${t} meals checked. Check what you ate so the diet counts.`,
    promise: (x) => `You promised: "${x}"`,
    promiseBody: 'Did you keep it? Mark it in your Project.',
    cardio: (x) => `${x} min of cardio left this week`,
    cardioBody: (d, g, days) => `${d} of ${g} min so far. ${days <= 1 ? 'Today is the last day.' : `${days} days left.`}`,
    trainWeek: (d, p) => `${d} of ${p} workouts this week`,
    trainWeekBody: (w, h) => (w ? `Today: ${w} at ${h}. Don't let the week slip.` : 'There is still time to close the week.'),
    pace: (kg, days) => `${kg} kg and ${days} days to go`,
    paceBody: (pw, r) => `That is ${pw} kg per week${r ? ` for "${r}"` : ''}.`,
    letter: (c) => `You wrote: "${c}"`,
    letterBody: (x, n) => `Day ${x} of ${n}. Don't let it become another attempt.`,
    ask: 'What time are you training today?',
    askBody: (s) => (s >= 7 ? `I couldn't find it in your day. ${s} days in a row: don't let today pass without a time.` : "I couldn't find it in your day. Tap and tell me a time."),
    chaseAsk: "I still don't know when you're training",
    chaseAskBody: (s) => (s >= 7 ? `You didn't get to ${s} days in a row by leaving it for later. Pick a time.` : "Tell me a time and I'll help you get there."),
    chaseLate: (s) => (s >= 7 ? `${s} days in a row. Throwing that away today?` : "It's getting late... losing another day?"),
    chaseLateBody: (s) => (s >= 7 ? "People who got this far don't stop out of laziness. Open and tell me what's going on." : "Open the app and tell me what's holding you back. We'll fix it."),
    chase5: 'Just think about the next 5 minutes',
    chase5Body: 'Just think about the next 5 minutes: get dressed and leave the house. The rest comes after.',
    chaseMission: "Today's mission: get to the gym",
    chaseMissionBody: (s) => (s >= 7 ? "Just get there. It doesn't need to be your best workout. It needs to happen." : 'Just showing up counts. 20 minutes and the day is yours.'),
    chaseWas: (h) => `It was supposed to be at ${h}. Have you left yet?`,
    chaseWasBody: "There's still time. Open and tell me if you're on your way.",
  },
  es: {
    day: (x, n) => `Día ${x} de ${n}`,
    wakeRestart: 'Ayer no contó. Hoy se empieza de nuevo.',
    wakeTrain: (x, n, w, h) => `Día ${x} de ${n}: ${w} a las ${h}`,
    wakeRest: (x, n) => `Día ${x} de ${n}: día de descanso`,
    wakeBody: (s, what, h) => (s > 0 ? `Racha de ${s} ${s === 1 ? 'día' : 'días'}. ` : '') + (what ? `Primer paso: ${what} a las ${h}.` : 'Abre y mira tu día.'),
    meal: (h, name) => `${h} · ${name}`,
    mealBody: (items, done, total, missed) => `${items ? items + '. ' : ''}${missed ? `Aún sin marcar: ${missed}.` : `${done} de ${total} comidas hechas hoy.`}`,
    task: (h, x) => `${h} · ${x}`,
    taskBody: (done, total) => (total === 1 ? '¿Lo hiciste? Márcalo en la app para que cuente.' : `${done} de ${total} tareas de hoy hechas. Márcalo en la app.`),
    custom: 'Un mensaje que tú mismo escribiste.',
    train: (w, h) => `Entreno en 1h: ${w} a las ${h}`,
    trainBody: (n, done, planned) => `${n ? `${n} ejercicios. ` : ''}Semana: ${done} de ${planned} entrenos hechos.`,
    checkin: 'Rinde cuentas: toma 1 minuto',
    checkinBody: (md, mt, tr, s) => `Hoy: ${md} de ${mt} comidas, entreno ${tr}. ${s > 0 ? `Racha de ${s} días en juego.` : 'Haz que el día cuente.'}`,
    trDone: 'hecho',
    trPending: 'pendiente',
    trRest: 'de descanso',
    late: (h) => (h <= 1 ? 'Falta 1h para que hoy no cuente' : `Faltan ${h}h para que hoy no cuente`),
    lateBodyStreak: (s) => `Sin rendir cuentas, la racha de ${s} ${s === 1 ? 'día' : 'días'} vuelve a cero.`,
    lateBodyZero: (x) => `El día ${x} sigue en blanco. 1 minuto y cuenta.`,
    weekly: 'Hoy toca la foto semanal',
    weeklyBody: (w, left, goal) => `Último pesaje: ${w} kg. Faltan ${left} kg para ${goal} kg.`,
    missed: (names) => `Aún no marcaste: ${names}`,
    missedBody: (d, t) => `${d} de ${t} comidas marcadas. Marca lo que comiste para que la dieta cuente.`,
    promise: (x) => `Prometiste: "${x}"`,
    promiseBody: '¿Lo cumpliste? Márcalo en el Proyecto.',
    cardio: (x) => `Faltan ${x} min de cardio en la semana`,
    cardioBody: (d, g, days) => `${d} de ${g} min hasta ahora. ${days <= 1 ? 'Queda hoy.' : `Quedan ${days} días.`}`,
    trainWeek: (d, p) => `${d} de ${p} entrenos en la semana`,
    trainWeekBody: (w, h) => (w ? `Hoy toca ${w} a las ${h}. No dejes escapar la semana.` : 'Todavía hay tiempo de cerrar la semana.'),
    pace: (kg, days) => `Faltan ${kg} kg y ${days} días`,
    paceBody: (pw, r) => `Eso es ${pw} kg por semana${r ? ` para "${r}"` : ''}.`,
    letter: (c) => `Escribiste: "${c}"`,
    letterBody: (x, n) => `Día ${x} de ${n}. Que no sea otro intento más.`,
    ask: '¿A qué hora vas a entrenar hoy?',
    askBody: (s) => (s >= 7 ? `No lo encontré en tu día. ${s} días seguidos: no dejes pasar el día sin horario.` : 'No lo encontré en tu día. Toca y dime un horario.'),
    chaseAsk: 'Aún no sé a qué hora vas a entrenar',
    chaseAskBody: (s) => (s >= 7 ? `No llegaste a ${s} días seguidos dejándolo para después. Elige un horario.` : 'Dime un horario y te ayudo a llegar.'),
    chaseLate: (s) => (s >= 7 ? `${s} días seguidos. ¿Vas a tirarlos hoy?` : 'Ya se está haciendo tarde... ¿vas a perder otro día?'),
    chaseLateBody: (s) => (s >= 7 ? 'Quien llegó hasta aquí no para por pereza. Abre y dime qué pasa.' : 'Abre la app y cuéntame qué te frena. Lo resolvemos.'),
    chase5: 'Piensa solo en los próximos 5 minutos',
    chase5Body: 'Piensa solo en los próximos 5 minutos: vístete y sal de casa. Lo demás viene después.',
    chaseMission: 'Misión de hoy: llegar al gimnasio',
    chaseMissionBody: (s) => (s >= 7 ? 'Solo llega. No tiene que ser tu mejor entreno. Tiene que existir.' : 'Solo llegar ya cuenta. 20 minutos y el día es tuyo.'),
    chaseWas: (h) => `Era a las ${h}. ¿Ya saliste de casa?`,
    chaseWasBody: 'Aún hay tiempo. Abre y dime si vas en camino.',
  },
}

// ---------- leitura do estado da pessoa ----------
function snapshot(d, now) {
  const p = d.profile || {}
  const date = now.date
  const checks = d.checks?.[date] || {}
  const daily = d.daily || {}
  const log = daily[date]
  const meals = [...(p.meals || [])].sort((a, b) => toMin(a.time) - toMin(b.time))
  const mealsDone = meals.filter((m) => checks[m.id]).length
  const mealsMissed = meals.filter((m) => !checks[m.id] && toMin(m.time) + 30 <= now.min)
  const tasks = (p.tasks || []).filter((x) => x.title?.trim())
  const tasksDone = tasks.filter((x) => checks[x.id]).length
  const hasPlan = (p.workouts || []).some((w) => String(w.items || '').trim())
  const wk = (p.workouts || []).find((w) => w.weekday === now.dow && String(w.items || '').trim())
  const trainDone = !!checks.train || !!checks.gym || log?.trained === 'sim'
  const trainAt = d.trainAt?.[date] || ''
  // sequência: noites seguidas com prestação de contas, terminando hoje ou ontem
  let streak = 0
  let day = log ? date : addDays(date, -1)
  while (daily[day]) {
    streak++
    day = addDays(day, -1)
  }
  // ciclo
  const start = p.startDate || date
  const cycle = p.cycleDays || 90
  const dayX = Math.max(1, Math.min(cycle, daysBetween(start, date) + 1))
  // semana (segunda até hoje)
  const ws = mondayOf(date)
  const weekDays = []
  for (let k = ws; k <= date; k = addDays(k, 1)) weekDays.push(k)
  const planned = hasPlan ? weekDays.filter((k) => (p.workouts || []).some((w) => w.weekday === dowOf(k) && String(w.items || '').trim())).length : 0
  const trainedWeek = weekDays.filter((k) => daily[k]?.trained === 'sim' || (k === date && checks.train)).length
  const cardioWeek = weekDays.reduce((a, k) => a + (Number(daily[k]?.cardioMin) || 0), 0)
  const cardioGoal = Number(p.cardioGoalMin) || 0
  // peso
  const weeks = Object.values(d.weekly || {}).sort((a, b) => String(a.weekStart).localeCompare(String(b.weekStart)))
  const weight = weeks.length ? Number(weeks[weeks.length - 1].weight) || p.weightStart : p.weightStart
  const pj = d.projeto || {}
  const openPromise = (pj.promises || []).find((x) => x.status === 'aberta' && x.date < date)
  const target = pj.vision?.targetDate
  const letter = String(p.letter || '').trim().split(/(?<=[.!?])\s/)[0]
  return { trainAt, p, date, checks, log, meals, mealsDone, mealsMissed, tasks, tasksDone, hasPlan, wk, trainDone, streak, dayX, cycle, planned, trainedWeek, cardioWeek, cardioGoal, weight, pj, openPromise, target, letter, weeklyDone: !!d.weekly?.[ws], everReported: Object.keys(daily).length > 0, yesterdayReported: !!daily[addDays(date, -1)] }
}

// ---------- os 3 horários de cada período ----------
const PRIO = { checkin: 1, chase: 1.5, late: 2, chaseask: 2.5, train: 3, wake: 4, weekly: 5, meal: 6, task: 7, custom: 8, status: 9 }
export function slotsFor(d, now) {
  const p = d.profile || {}
  const wake = toMin(p.wake || '06:30')
  const sleep = Math.min(toMin(p.sleep || '23:00') || 1380, 23 * 60 + 40)
  const ci = toMin(p.checkinTime || '21:30')
  const ev = [{ m: wake + 5, kind: 'wake' }]
  for (const m of p.meals || []) ev.push({ m: toMin(m.time), kind: 'meal', ref: m.id })
  for (const x of p.tasks || []) if (x.title?.trim()) ev.push({ m: toMin(x.time), kind: 'task', ref: x.id })
  for (const c of d.custom || []) if (c.on && String(c.text || '').trim()) ev.push({ m: toMin(c.time), kind: 'custom', ref: c.id })
  const hasPlan = (p.workouts || []).some((w) => String(w.items || '').trim())
  const trainDay = (p.workouts || []).some((w) => w.weekday === now.dow && String(w.items || '').trim())
  const at = d.trainAt?.[now.date]
  if (trainDay) ev.push({ m: Math.max(0, toMin(at || p.trainTime) - 60), kind: 'train' })
  // perseguir o treino ao longo do dia (dia de treino, ou sem ficha cadastrada)
  const c = d.checks?.[now.date] || {}
  const trained = c.train || c.gym || d.daily?.[now.date]?.trained === 'sim'
  if ((trainDay || !hasPlan) && !trained) {
    if (!at) ev.push({ m: 14 * 60, kind: 'chaseask', stage: 'ask' })
    ev.push({ m: 18 * 60 + 30, kind: 'chase', stage: 'late' }, { m: 19 * 60 + 45, kind: 'chase', stage: 'five' })
    if (at) ev.push({ m: toMin(at) + 20, kind: 'chase', stage: 'was' })
  }
  ev.push({ m: ci, kind: 'checkin' })
  ev.push({ m: Math.min(ci + 90, sleep - 20), kind: 'late' })
  if (now.dow === 0) ev.push({ m: Math.max(wake + 120, 10 * 60), kind: 'weekly' })
  const periods = [
    [wake, 12 * 60],
    [12 * 60, 18 * 60],
    [18 * 60, sleep],
  ]
  const out = []
  periods.forEach(([a, b], pi) => {
    if (b - a < 30) return
    const inside = ev.filter((e) => e.m >= a && e.m < b).sort((x, y) => PRIO[x.kind] - PRIO[y.kind] || x.m - y.m)
    const chosen = []
    for (const e of inside) {
      if (chosen.length >= 3) break
      if (chosen.every((c) => Math.abs(c.m - e.m) >= 45)) chosen.push(e)
    }
    // completa com "situação" em horários livres do período
    const span = b - a
    for (const f of [0.3, 0.6, 0.85, 0.15, 0.45, 0.72]) {
      if (chosen.length >= 3) break
      const m = Math.round(a + span * f)
      if (chosen.every((c) => Math.abs(c.m - m) >= 45)) chosen.push({ m, kind: 'status' })
    }
    chosen.sort((x, y) => x.m - y.m).forEach((c, i) => out.push({ ...c, id: `${pi}${i}` }))
  })
  return out
}

// ---------- montar a mensagem ----------
function compose(slot, s, now, L, usedStatus) {
  const p = s.p
  const nextItem = (() => {
    const items = [...s.meals.map((m) => ({ m: toMin(m.time), t: m.name })), ...s.tasks.map((x) => ({ m: toMin(x.time), t: x.title }))].filter((x) => x.m >= now.min).sort((a, b) => a.m - b.m)
    return items[0]
  })()
  switch (slot.kind) {
    case 'chaseask':
    case 'chase': {
      const wantTrain = s.wk || !s.hasPlan
      if (!wantTrain || s.trainDone) return null
      const atMin = s.trainAt ? toMin(s.trainAt) : null
      if (slot.stage === 'was') return atMin !== null && now.min >= atMin + 15 ? { title: L.chaseWas(s.trainAt), body: L.chaseWasBody, key: 'chase:was' } : null
      if (atMin !== null && now.min < atMin + 15) return null // tem horário e ainda não chegou: deixa o lembrete do treino agir
      if (slot.stage === 'ask') return s.trainAt ? null : { title: L.chaseAsk, body: L.chaseAskBody(s.streak), key: 'chase:ask' }
      if (slot.stage === 'late') return { title: L.chaseLate(s.streak), body: L.chaseLateBody(s.streak), key: 'chase:late' }
      if (slot.stage === 'five') return { title: L.chaseMission, body: L.chase5Body, key: 'chase:five' }
      return null
    }
    case 'wake': {
      if ((s.wk || !s.hasPlan) && !s.trainAt && !s.trainDone) return { title: L.ask, body: L.askBody(s.streak), key: 'ask' }
      if (s.everReported && !s.yesterdayReported && s.streak === 0) return { title: L.wakeRestart, body: L.wakeBody(0, nextItem?.t, nextItem && hhmm(nextItem.m)), key: 'wake' }
      const title = s.wk ? L.wakeTrain(s.dayX, s.cycle, cut(s.wk.title, 24), p.trainTime) : L.wakeRest(s.dayX, s.cycle)
      return { title, body: L.wakeBody(s.streak, nextItem?.t, nextItem && hhmm(nextItem.m)), key: 'wake' }
    }
    case 'meal': {
      const m = s.meals.find((x) => x.id === slot.ref)
      if (!m || s.checks[m.id]) return null
      const missed = s.mealsMissed.filter((x) => x.id !== m.id).map((x) => x.name).slice(0, 2).join(', ')
      return { title: L.meal(m.time, cut(m.name, 30)), body: cut(L.mealBody(cut(firstLine(m.items), 70), s.mealsDone, s.meals.length, missed), 140), key: `meal:${m.id}` }
    }
    case 'task': {
      const x = s.tasks.find((k) => k.id === slot.ref)
      if (!x || s.checks[x.id]) return null
      return { title: L.task(x.time, cut(x.title, 40)), body: L.taskBody(s.tasksDone, s.tasks.length), key: `task:${x.id}` }
    }
    case 'custom': {
      const c = (s.custom || []).find((k) => k.id === slot.ref)
      return c ? { title: cut(c.text, 70), body: L.custom, key: `custom:${c.id}` } : null
    }
    case 'train': {
      if (!s.wk || s.trainDone) return null
      if (s.trainAt) p.trainTime = s.trainAt
      const n = String(s.wk.items || '').split('\n').filter((x) => x.trim()).length
      return { title: L.train(cut(s.wk.title, 26), p.trainTime), body: L.trainBody(n, s.trainedWeek, s.planned), key: 'train' }
    }
    case 'checkin': {
      if (s.log) return null
      const tr = !s.wk ? L.trRest : s.trainDone ? L.trDone : L.trPending
      return { title: L.checkin, body: L.checkinBody(s.mealsDone, s.meals.length, tr, s.streak), key: 'checkin' }
    }
    case 'late': {
      if (s.log) return null
      const h = Math.max(1, Math.round((24 * 60 - now.min) / 60))
      return { title: L.late(h), body: s.streak > 0 ? L.lateBodyStreak(s.streak) : L.lateBodyZero(s.dayX), key: 'late' }
    }
    case 'weekly': {
      if (s.weeklyDone) return null
      const left = Math.max(0, Math.round((s.weight - p.weightGoal) * 10) / 10)
      return { title: L.weekly, body: L.weeklyBody(s.weight, left, p.weightGoal), key: 'weekly' }
    }
  }
  return null
}

/** Quando o horário não tem evento (ou o evento já foi cumprido): a situação mais útil agora. */
function status(s, now, L, used) {
  const p = s.p
  const opts = []
  if (s.mealsMissed.length) opts.push({ key: 'st:missed', title: L.missed(cut(s.mealsMissed.map((m) => m.name).slice(0, 2).join(', '), 40)), body: L.missedBody(s.mealsDone, s.meals.length) })
  if (s.openPromise) opts.push({ key: 'st:promise', title: L.promise(cut(s.openPromise.text, 50)), body: L.promiseBody })
  const daysLeftWeek = 7 - ((now.dow + 6) % 7)
  if (s.cardioGoal && s.cardioWeek < s.cardioGoal && now.dow !== 1) opts.push({ key: 'st:cardio', title: L.cardio(s.cardioGoal - s.cardioWeek), body: L.cardioBody(s.cardioWeek, s.cardioGoal, daysLeftWeek) })
  if (s.planned > 0 && s.trainedWeek < s.planned) opts.push({ key: 'st:trainweek', title: L.trainWeek(s.trainedWeek, s.planned), body: L.trainWeekBody(s.wk && !s.trainDone ? cut(s.wk.title, 24) : '', p.trainTime) })
  if (p.weightGoal && s.weight > p.weightGoal && s.target) {
    const days = Math.max(1, daysBetween(s.date, s.target))
    const kg = Math.round((s.weight - p.weightGoal) * 10) / 10
    opts.push({ key: 'st:pace', title: L.pace(kg, days), body: L.paceBody((Math.round((kg / (days / 7)) * 10) / 10).toLocaleString(), cut(s.pj.vision?.result, 40)) })
  }
  if (s.letter) opts.push({ key: 'st:letter', title: L.letter(cut(s.letter, 60)), body: L.letterBody(s.dayX, s.cycle) })
  return opts.find((o) => !used.has(o.key)) || null
}

// ---------- agendador ----------
async function tick() {
  const cfg = await getSetting('notifications', { enabled: true })
  if (!cfg.enabled) return
  const rows = await q(`
    select u.id, u.tz, u.lang, s.data
    from users u join app_state s on s.user_id = u.id
    where u.status = 'approved' and u.notif_paused = false
      and exists (select 1 from push_subs p where p.user_id = u.id)`)
  for (const r of rows.rows) {
    const d = r.data || {}
    if (!d.onboarded || d.demo) continue
    const now = localNow(r.tz)
    const due = slotsFor(d, now).filter((sl) => now.min >= sl.m && now.min - sl.m <= 10)
    if (!due.length) continue
    const L = T[d.lang || r.lang] || T.pt
    const s = { ...snapshot(d, now), custom: d.custom || [] }
    // o que já saiu hoje (para não repetir a mesma "situação")
    const sent = await q(`select dedupe from notif_log where user_id = $1 and dedupe like $2`, [r.id, `c:${now.date}:%`])
    const used = new Set(sent.rows.map((x) => x.dedupe.split(':').slice(2).join(':')))
    for (const sl of due) {
      const slotKey = `c:${now.date}:slot${sl.id}`
      if (used.has(`slot${sl.id}`)) continue
      const msg = (sl.kind !== 'status' && compose(sl, s, now, L, used)) || status(s, now, L, used)
      // marca o horário como usado mesmo sem mensagem, para não tentar de novo
      await q(`insert into notif_log (user_id, kind, dedupe, title, body, ok) values ($1, 'coach', $2, $3, $4, false) on conflict do nothing`, [r.id, slotKey, msg?.title || '-', msg?.body || '-'])
      used.add(`slot${sl.id}`)
      if (!msg) continue
      if (msg.key.startsWith('st:')) {
        await q(`insert into notif_log (user_id, kind, dedupe, title, body, ok) values ($1, 'coach-key', $2, '-', '-', true) on conflict do nothing`, [r.id, `c:${now.date}:${msg.key}`])
        used.add(msg.key)
      }
      const open = msg.key === 'ask' || msg.key.startsWith('chase') ? 'coach' : { checkin: 'checkin', late: 'checkin', train: 'plano', weekly: 'semanal', wake: 'dia' }[msg.key] || (msg.key.startsWith('meal') || msg.key.startsWith('task') || msg.key === 'st:missed' ? 'dia' : msg.key === 'st:promise' ? 'promessas' : msg.key === 'st:cardio' || msg.key === 'st:trainweek' ? 'plano' : msg.key === 'st:pace' ? 'evolucao' : 'inicio')
      await sendToUser(r.id, { title: msg.title, body: msg.body, kind: 'rotina', dedupe: `${slotKey}:send`, url: `/?abrir=${open}` })
    }
  }
}

export function startCoach() {
  const run = () => tick().catch((e) => console.error('coach:', e.message))
  setTimeout(run, 8000)
  return setInterval(run, 60_000)
}

// para testes
export const _test = { snapshot, compose, status, slotsFor, T }
