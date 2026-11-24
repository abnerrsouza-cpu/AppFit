// Motor das notificações: 3 por período (manhã, tarde, noite), montadas NA HORA do envio
// com os dados do momento: horário x metas x desempenho x dados da pessoa.
// Regra: o título é a própria mensagem; o texto de baixo traz o dado que justifica abrir o app.
import { getSetting, q } from './db.mjs'
import { sendToUser } from './push.mjs'

/** Jeito de cobrar pelo momento da pessoa (igual ao app): leve = primeiros passos, serio = à risca. */
function coachStyle(p, streak) {
  if (p.moment === 'treino') return streak >= 3 || streak === 0 ? 'serio' : 'medio'
  if (p.moment === 'nunca' || p.moment === 'desanimado') return streak >= 21 ? 'medio' : 'leve'
  if (p.moment === 'parei') return streak >= 14 ? 'serio' : streak >= 5 ? 'medio' : 'leve'
  return streak >= 7 ? 'serio' : 'medio'
}

/** Dias de treino: com exercícios escritos ou, no modo "só marcar" (ou ficha só em arquivo), os dias escolhidos. */
function trainDays(p) {
  const ws = p.workouts || []
  const written = ws.some((w) => String(w.items || '').trim())
  const simple = p.trainMode === 'check' || ((p.trainFiles || []).length > 0 && !written)
  return ws.filter((w) => simple || String(w.items || '').trim()).map((w) => w.weekday)
}

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
    won: [
      ['Viu que treinar 1 horinha não mata?', 'E o resto do dia fica mais leve. Agora é fechar com a dieta.'],
      ['Treinou e matou o dia. Isso aí.', 'O mais difícil já foi. Hoje ninguém te segura.'],
      ['Bom, né? Já ter treinado.', 'Essa sensação é o prêmio por não ter dado desculpa.'],
      ['Treino pago. Dia ganho.', 'Amanhã você vai querer sentir isso de novo.'],
    ],
    locale: 'pt-BR',
    go: (h) => `Treino às ${h}: hora de se arrumar`,
    goBody: 'Roupa, garrafinha e porta. Em 15 minutos você tem que estar saindo.',
    miss: (h) => `Você disse ${h}. Não foi.`,
    missBody: (s) => (s >= 7 ? `${s} dias seguidos não podem morrer hoje. Ainda dá: 30 minutos já contam.` : 'Sem desculpa. Ainda dá tempo: me diz agora que horas você vai.'),
    lunchDone: 'Cuidado pra não perder seu treino em 20 min de almoço',
    lunchDoneBody: (it) => (it ? `Você já treinou. No prato: ${it}.` : 'Você já treinou. Prato limpo: proteína, salada e sem exagero.'),
    lunchBefore: (h) => `Almoço leve: treino às ${h}`,
    lunchBeforeBody: 'Comer pesado agora vira desculpa pronta mais tarde.',
    lunchAsk: 'Hora do almoço e você ainda não marcou o treino',
    lunchAskBody: 'Decide agora: que horas você vai? Me diz que eu te ajudo a chegar lá.',
    lunchRest: 'Dia de descanso não é dia de jacar',
    lunchRestBody: (it) => (it ? `No prato: ${it}.` : 'Proteína, salada e sem exagero. O músculo cresce com o que você come hoje.'),
    cardioToday: (n) => `Falta o cardio de hoje: ${n} min`,
    cardioAfter: 'Você já treinou. Fecha com o cardio e o dia fica completo. Marque no app.',
    cardioPlain: 'Esteira, bike ou caminhada. Marque no app quando fizer.',
    waterLast: (l) => `Só falta a água: ${l} L`,
    waterLastBody: 'Treino, dieta e cardio feitos. Fecha o dia 100%: bebe agora e marque no app.',
    waterBehind: (a, b) => `Água: ${a} L de ${b} L`,
    waterBehindBody: (c) => `Pelo horário, você já devia estar em ${c} L. Bebe um copo agora.`,
    chaseAsk2: 'Metade do dia e nada de horário pro treino',
    chaseAsk2Body: 'Quem não marca horário não vai. Escolhe agora: fim de tarde ou noite?',
    askLeve: 'Bom dia. Que horas sai o treino de hoje?',
    askLeveBody: 'Não precisa ser longo: 20 minutos já contam. Me diz um horário.',
    askSerio: 'Que horas é o treino de hoje?',
    askSerioBody: 'Projeto à risca: treino tem horário marcado. Me diz agora.',
    lateSerio: 'O dia está acabando e o treino não saiu',
    lateSerioBody: 'Quem leva a sério não negocia com a preguiça. Vai agora.',
    missLeve: (h) => `Era às ${h}. Tudo bem, ainda dá.`,
    missLeveBody: 'Pensa só nos próximos 5 minutos: troca de roupa e sai de casa. Só isso.',
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
    won: [
      ['See? One hour of training won\'t kill you.', 'And the rest of the day feels lighter. Now close it out with your diet.'],
      ['You trained and won the day.', 'The hardest part is done. Nothing stops you today.'],
      ['Feels good, right? Already trained.', 'That feeling is your prize for not making excuses.'],
      ['Workout paid. Day won.', "Tomorrow you'll want to feel this again."],
    ],
    locale: 'en-US',
    go: (h) => `Workout at ${h}: time to get ready`,
    goBody: 'Clothes, bottle, door. In 15 minutes you need to be leaving.',
    miss: (h) => `You said ${h}. You didn't go.`,
    missBody: (s) => (s >= 7 ? `${s} days in a row can't die today. There's still time: 30 minutes counts.` : "No excuses. There's still time: tell me now what time you're going."),
    lunchDone: "Don't throw away your workout in a 20-minute lunch",
    lunchDoneBody: (it) => (it ? `You already trained. On the plate: ${it}.` : 'You already trained. Clean plate: protein, salad, no overdoing it.'),
    lunchBefore: (h) => `Light lunch: workout at ${h}`,
    lunchBeforeBody: 'Eating heavy now becomes a ready-made excuse later.',
    lunchAsk: "It's lunchtime and your workout still has no time",
    lunchAskBody: "Decide now: what time are you going? Tell me and I'll help you get there.",
    lunchRest: "Rest day isn't cheat day",
    lunchRestBody: (it) => (it ? `On the plate: ${it}.` : 'Protein, salad, no overdoing it. Muscle grows from what you eat today.'),
    cardioToday: (n) => `Today's cardio is missing: ${n} min`,
    cardioAfter: 'You already trained. Finish with cardio and the day is complete. Check it in the app.',
    cardioPlain: 'Treadmill, bike or a walk. Check it in the app when done.',
    waterLast: (l) => `Only water left: ${l} L`,
    waterLastBody: 'Workout, diet and cardio done. Close the day at 100%: drink now and log it.',
    waterBehind: (a, b) => `Water: ${a} L of ${b} L`,
    waterBehindBody: (c) => `By now you should be at ${c} L. Drink a glass now.`,
    chaseAsk2: 'Half the day gone and no workout time yet',
    chaseAsk2Body: "If you don't set a time, you don't go. Pick now: late afternoon or evening?",
    askLeve: "Good morning. What time is today's workout?",
    askLeveBody: "It doesn't have to be long: 20 minutes counts. Tell me a time.",
    askSerio: "What time is today's workout?",
    askSerioBody: 'Following the plan to the letter: workouts have a set time. Tell me now.',
    lateSerio: "The day is ending and the workout didn't happen",
    lateSerioBody: "If you're serious, you don't negotiate with laziness. Go now.",
    missLeve: (h) => `It was at ${h}. That's okay, there's still time.`,
    missLeveBody: 'Just think about the next 5 minutes: change clothes and leave the house. That is all.',
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
    won: [
      ['¿Viste que entrenar una horita no mata?', 'Y el resto del día se siente más liviano. Ahora ciérralo con la dieta.'],
      ['Entrenaste y ganaste el día.', 'Lo más difícil ya pasó. Hoy nadie te para.'],
      ['Se siente bien, ¿no? Ya haber entrenado.', 'Esa sensación es el premio por no poner excusas.'],
      ['Entreno pagado. Día ganado.', 'Mañana vas a querer sentir esto otra vez.'],
    ],
    locale: 'es',
    go: (h) => `Entreno a las ${h}: hora de prepararte`,
    goBody: 'Ropa, botella y puerta. En 15 minutos tienes que estar saliendo.',
    miss: (h) => `Dijiste ${h}. No fuiste.`,
    missBody: (s) => (s >= 7 ? `${s} días seguidos no pueden morir hoy. Aún hay tiempo: 30 minutos cuentan.` : 'Sin excusas. Aún hay tiempo: dime ahora a qué hora vas.'),
    lunchDone: 'Cuidado de no tirar tu entreno en 20 min de almuerzo',
    lunchDoneBody: (it) => (it ? `Ya entrenaste. En el plato: ${it}.` : 'Ya entrenaste. Plato limpio: proteína, ensalada y sin exagerar.'),
    lunchBefore: (h) => `Almuerzo liviano: entreno a las ${h}`,
    lunchBeforeBody: 'Comer pesado ahora se vuelve excusa lista más tarde.',
    lunchAsk: 'Hora del almuerzo y tu entreno sigue sin horario',
    lunchAskBody: 'Decide ahora: ¿a qué hora vas? Dime y te ayudo a llegar.',
    lunchRest: 'Día de descanso no es día de trampa',
    lunchRestBody: (it) => (it ? `En el plato: ${it}.` : 'Proteína, ensalada y sin exagerar. El músculo crece con lo que comes hoy.'),
    cardioToday: (n) => `Falta el cardio de hoy: ${n} min`,
    cardioAfter: 'Ya entrenaste. Cierra con el cardio y el día queda completo. Márcalo en la app.',
    cardioPlain: 'Cinta, bici o caminata. Márcalo en la app cuando lo hagas.',
    waterLast: (l) => `Solo falta el agua: ${l} L`,
    waterLastBody: 'Entreno, dieta y cardio hechos. Cierra el día al 100%: bebe ahora y regístralo.',
    waterBehind: (a, b) => `Agua: ${a} L de ${b} L`,
    waterBehindBody: (c) => `A esta hora ya deberías estar en ${c} L. Bebe un vaso ahora.`,
    chaseAsk2: 'Medio día y tu entreno sigue sin horario',
    chaseAsk2Body: 'Quien no fija horario no va. Elige ahora: ¿tarde o noche?',
    askLeve: 'Buenos días. ¿A qué hora es el entreno de hoy?',
    askLeveBody: 'No tiene que ser largo: 20 minutos ya cuentan. Dime una hora.',
    askSerio: '¿A qué hora es el entreno de hoy?',
    askSerioBody: 'Proyecto al pie de la letra: el entreno tiene hora fija. Dímela ahora.',
    lateSerio: 'El día se acaba y el entreno no salió',
    lateSerioBody: 'Quien va en serio no negocia con la pereza. Ve ahora.',
    missLeve: (h) => `Era a las ${h}. Tranquilo, aún hay tiempo.`,
    missLeveBody: 'Piensa solo en los próximos 5 minutos: cámbiate y sal de casa. Solo eso.',
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
  const meals = (p.meals || []).filter((m) => String(m.items || '').trim()).sort((a, b) => toMin(a.time) - toMin(b.time))
  const mealsDone = meals.filter((m) => checks[m.id]).length
  const mealsMissed = meals.filter((m) => !checks[m.id] && toMin(m.time) + 30 <= now.min)
  const tasks = (p.tasks || []).filter((x) => x.title?.trim())
  const tasksDone = tasks.filter((x) => checks[x.id]).length
  const hasPlan = trainDays(p).length > 0
  const wk = trainDays(p).includes(now.dow) ? (p.workouts || []).find((w) => w.weekday === now.dow) : undefined
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
  const planned = hasPlan ? weekDays.filter((k) => trainDays(p).includes(dowOf(k))).length : 0
  const trainedWeek = weekDays.filter((k) => daily[k]?.trained === 'sim' || d.checks?.[k]?.train || d.checks?.[k]?.gym).length
  const cardioGoal = Number(p.cardioGoalMin) || 0
  const cardioDaily = Math.max(10, Math.round(cardioGoal / 5))
  const cardioWeek = weekDays.reduce((a, k) => a + (Number(daily[k]?.cardioMin) || (d.checks?.[k]?.cardio ? cardioDaily : 0)), 0)
  const cardioDone = !!checks.cardio || (Number(log?.cardioMin) || 0) > 0
  const cardioPending = cardioGoal > 0 && !cardioDone && cardioWeek < cardioGoal
  // peso
  const weeks = Object.values(d.weekly || {}).sort((a, b) => String(a.weekStart).localeCompare(String(b.weekStart)))
  const weight = weeks.length ? Number(weeks[weeks.length - 1].weight) || p.weightStart : p.weightStart
  const pj = d.projeto || {}
  const openPromise = (pj.promises || []).find((x) => x.status === 'aberta' && x.date < date)
  const target = pj.vision?.targetDate
  const letter = String(p.letter || '').trim().split(/(?<=[.!?])\s/)[0]
  // água e "dia completo"
  const waterMl = Number(d.water?.[date]) || 0
  const waterGoal = Math.max(1500, Math.round(((Number(weight) || 70) * 35) / 500) * 500)
  const dietSimple = p.dietMode === 'check' || ((p.dietFiles || []).length > 0 && !meals.length)
  const ateOk = meals.length ? mealsMissed.length === 0 : dietSimple ? !!checks.diet || now.min < 20 * 60 : true
  const wantTrain = !!wk || !hasPlan
  const allDone = (trainDone || !wantTrain) && ateOk && !cardioPending
  const lunch = meals.find((m) => /almo|lunch|comida/i.test(m.name)) || null
  const doneAt = d.trainDoneAt?.[date] || ''
  return { style: coachStyle(p, streak), waterMl, waterGoal, allDone, wantTrain, lunch, doneAt, cardioDone, cardioDaily, cardioPending, trainAt, p, date, checks, log, meals, mealsDone, mealsMissed, tasks, tasksDone, hasPlan, wk, trainDone, streak, dayX, cycle, planned, trainedWeek, cardioWeek, cardioGoal, weight, pj, openPromise, target, letter, weeklyDone: !!d.weekly?.[ws], everReported: Object.keys(daily).length > 0, yesterdayReported: !!daily[addDays(date, -1)] }
}

// ---------- os 3 horários de cada período ----------
const PRIO = { checkin: 1, chase: 1.5, late: 2, chaseask: 2.5, train: 3, wake: 4, weekly: 5, meal: 6, water: 6.5, task: 7, custom: 8, status: 9 }
export function slotsFor(d, now) {
  const p = d.profile || {}
  const s = snapshot(d, now)
  const wake = toMin(p.wake || '06:30')
  const sleep = Math.min(toMin(p.sleep || '23:00') || 1380, 23 * 60 + 40)
  const ci = toMin(p.checkinTime || '21:30')
  const ev = [{ m: wake + 5, kind: 'wake' }]
  for (const m of p.meals || []) if (String(m.items || '').trim()) ev.push({ m: toMin(m.time), kind: 'meal', ref: m.id })
  for (const x of p.tasks || []) if (x.title?.trim()) ev.push({ m: toMin(x.time), kind: 'task', ref: x.id })
  for (const c of d.custom || []) if (c.on && String(c.text || '').trim()) ev.push({ m: toMin(c.time), kind: 'custom', ref: c.id })
  const at = s.trainAt ? toMin(s.trainAt) : null
  // sequência do treino: 1) descobrir o horário  2) acompanhar até ir  3) cobrar se não foi
  if (s.wantTrain && !s.trainDone) {
    if (at === null) {
      ev.push({ m: Math.max(wake + 150, 10 * 60), kind: 'chaseask', stage: 'ask' }, { m: 14 * 60, kind: 'chaseask', stage: 'ask' })
      if (s.wk) ev.push({ m: Math.max(0, toMin(p.trainTime) - 60), kind: 'train' })
    } else {
      if (s.wk) ev.push({ m: Math.max(0, at - 60), kind: 'train' })
      ev.push({ m: Math.max(0, at - 15), kind: 'go', p: 1.2 })
      ev.push({ m: at + 20, kind: 'chase', stage: 'was', p: 1.3 })
      ev.push({ m: at + 75, kind: 'chase', stage: 'miss', p: 1.4 })
    }
    ev.push({ m: 18 * 60 + 30, kind: 'chase', stage: 'late' }, { m: 19 * 60 + 45, kind: 'chase', stage: 'five' })
  }
  // almoço: proteger o treino (feito ou por fazer)
  ev.push({ m: (s.lunch ? toMin(s.lunch.time) : 12 * 60 + 30) - 10, kind: 'lunch', p: s.trainDone ? 2.2 : 3.5 })
  // cardio do dia
  if (s.cardioPending) {
    const base = s.trainDone && s.doneAt ? toMin(s.doneAt) + 45 : 16 * 60 + 30
    ev.push({ m: Math.min(Math.max(base, wake + 60), 20 * 60), kind: 'cardio', p: s.trainDone ? 2.4 : 5.5 }, { m: 15 * 60 + 30, kind: 'cardio', p: s.trainDone ? 2.4 : 5.5 })
    if (s.trainDone || !s.wantTrain) ev.push({ m: 19 * 60 + 15, kind: 'cardio', p: 5.5 }) // à noite, sem treino, o foco é o treino
  }
  // água: ao longo do dia; com treino, dieta e cardio feitos, fica em cima até bater a meta
  if (s.waterMl < s.waterGoal) {
    const times = s.allDone ? [10 * 60 + 30, 12 * 60 + 15, 14 * 60, 15 * 60 + 30, 17 * 60, 18 * 60 + 30, 20 * 60, 21 * 60 + 15] : [10 * 60 + 30, 15 * 60, 20 * 60]
    for (const m of times) if (m > wake + 60 && m < sleep - 30) ev.push({ m, kind: 'water', p: s.allDone ? 1.6 : 6.5 })
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
    const inside = ev.filter((e) => e.m >= a && e.m < b).sort((x, y) => (x.p ?? PRIO[x.kind]) - (y.p ?? PRIO[y.kind]) || x.m - y.m)
    const chosen = []
    for (const e of inside) {
      if (chosen.length >= 5) break
      if (chosen.every((c) => Math.abs(c.m - e.m) >= 30)) chosen.push(e)
    }
    // completa com "situação" em horários livres do período
    const span = b - a
    for (const f of [0.3, 0.6, 0.85, 0.15, 0.45, 0.72]) {
      if (chosen.length >= 4) break
      const m = Math.round(a + span * f)
      if (chosen.every((c) => Math.abs(c.m - m) >= 45)) chosen.push({ m, kind: 'status' })
    }
    // id estável (período + tipo + horário): o estado muda ao longo do dia e a lista é recalculada a cada minuto
    chosen.sort((x, y) => x.m - y.m).forEach((c) => out.push({ ...c, pi, id: `${pi}-${c.kind}-${c.stage || c.ref || ''}-${c.m}` }))
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
      if (slot.stage === 'ask') return s.trainAt ? null : now.min >= 13 * 60 ? { title: L.chaseAsk2, body: L.chaseAsk2Body, key: 'chase:ask2' } : { title: L.chaseAsk, body: L.chaseAskBody(s.streak), key: 'chase:ask' }
      if (slot.stage === 'late' && s.style === 'leve' && s.streak < 7) return { title: L.chase5, body: L.chase5Body, key: 'chase:late' }
      if (slot.stage === 'late' && s.style === 'serio' && s.streak < 7) return { title: L.lateSerio, body: L.lateSerioBody, key: 'chase:late' }
      if (slot.stage === 'late') return { title: L.chaseLate(s.streak), body: L.chaseLateBody(s.streak), key: 'chase:late' }
      if (slot.stage === 'five') return { title: L.chaseMission, body: L.chase5Body, key: 'chase:five' }
      if (slot.stage === 'miss') return atMin !== null && now.min >= atMin + 60 ? (s.style === 'leve' ? { title: L.missLeve(s.trainAt), body: L.missLeveBody, key: 'chase:miss' } : { title: L.miss(s.trainAt), body: L.missBody(s.streak), key: 'chase:miss' }) : null
      return null
    }
    case 'go': {
      if (s.trainDone || !s.trainAt) return null
      return { title: L.go(s.trainAt), body: L.goBody, key: 'go' }
    }
    case 'lunch': {
      const items = s.lunch ? cut(firstLine(s.lunch.items), 60) : ''
      if (s.trainDone) return { title: L.lunchDone, body: L.lunchDoneBody(items), key: 'lunch' }
      if (s.wantTrain && s.trainAt && toMin(s.trainAt) > now.min) return { title: L.lunchBefore(s.trainAt), body: L.lunchBeforeBody, key: 'lunch' }
      if (s.wantTrain && !s.trainAt) return { title: L.lunchAsk, body: L.lunchAskBody, key: 'lunch' }
      return { title: L.lunchRest, body: L.lunchRestBody(items), key: 'lunch' }
    }
    case 'cardio': {
      if (!s.cardioPending) return null
      return { title: L.cardioToday(s.cardioDaily), body: s.trainDone ? L.cardioAfter : L.cardioPlain, key: `cardio:${slot.m}` }
    }
    case 'water': {
      if (s.waterMl >= s.waterGoal) return null
      const wake = toMin(p.wake || '06:30')
      const end = Math.min(toMin(p.sleep || '23:00') || 1380, 23 * 60) - 60
      const expected = Math.round((s.waterGoal * Math.max(0, Math.min(1, (now.min - wake) / Math.max(60, end - wake)))) / 250) * 250
      const L1 = (ml) => (ml / 1000).toLocaleString(L.locale, { maximumFractionDigits: 2 })
      if (s.allDone) return { title: L.waterLast(L1(s.waterGoal - s.waterMl)), body: L.waterLastBody, key: `water:${slot.m}` }
      if (s.waterMl < expected - 250) return { title: L.waterBehind(L1(s.waterMl), L1(s.waterGoal)), body: L.waterBehindBody(L1(expected)), key: `water:${slot.m}` }
      return null
    }
    case 'wake': {
      if (s.trainDone) return null // já treinou cedo: o "vencedor" e a água/dieta assumem
      if ((s.wk || !s.hasPlan) && !s.trainAt && !s.trainDone) {
        if (s.style === 'leve' && s.streak < 7) return { title: L.askLeve, body: L.askLeveBody, key: 'ask' }
        if (s.style === 'serio' && s.streak < 7) return { title: L.askSerio, body: L.askSerioBody, key: 'ask' }
        return { title: L.ask, body: L.askBody(s.streak), key: 'ask' }
      }
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
  if (s.cardioGoal && s.cardioWeek < s.cardioGoal && now.dow !== 1 && !s.cardioPending) opts.push({ key: 'st:cardio', title: L.cardio(s.cardioGoal - s.cardioWeek), body: L.cardioBody(s.cardioWeek, s.cardioGoal, daysLeftWeek) })
  if (s.planned > 0 && s.trainedWeek < s.planned && !s.trainDone) opts.push({ key: 'st:trainweek', title: L.trainWeek(s.trainedWeek, s.planned), body: L.trainWeekBody(s.wk && !s.trainDone ? cut(s.wk.title, 24) : '', p.trainTime) })
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
    const L = T[d.lang || r.lang] || T.pt
    // vencedor: de 40 min a 3 h depois de marcar o treino, uma vez por dia (fora do limite de 3 por período)
    const doneAt = d.trainDoneAt?.[now.date]
    if (doneAt && d.checks?.[now.date]?.train && now.min >= toMin(doneAt) + 40 && now.min <= Math.min(toMin(doneAt) + 180, 23 * 60 + 30)) {
      const dk = `c:${now.date}:won`
      const ins = await q(`insert into notif_log (user_id, kind, dedupe, title, body, ok) values ($1, 'coach', $2, '-', '-', true) on conflict do nothing`, [r.id, dk])
      if (ins.rowCount) {
        const [title, body] = L.won[daysBetween('2024-01-01', now.date) % L.won.length]
        await sendToUser(r.id, { title, body, kind: 'rotina', dedupe: `${dk}:send`, url: '/?abrir=inicio' })
      }
    }
    const due = slotsFor(d, now).filter((sl) => now.min >= sl.m && now.min - sl.m <= 10)
    if (!due.length) continue
    const s = { ...snapshot(d, now), custom: d.custom || [] }
    // o que já saiu hoje (para não repetir a mesma "situação")
    const sent = await q(`select dedupe from notif_log where user_id = $1 and dedupe like $2`, [r.id, `c:${now.date}:%`])
    const used = new Set(sent.rows.map((x) => x.dedupe.split(':').slice(2).join(':')))
    const sentIn = (pi) => [...used].filter((k) => k.startsWith(`slot${pi}-`) && k.endsWith(':send')).length
    for (const sl of due) {
      const slotKey = `c:${now.date}:slot${sl.id}`
      if (used.has(`slot${sl.id}`)) continue
      if (sl.kind !== 'checkin' && sentIn(sl.pi) >= 3) continue // no máximo 3 por período (manhã, tarde, noite); a prestação de contas sempre sai
      let msg = sl.kind !== 'status' ? compose(sl, s, now, L, used) : null
      if (msg && used.has(msg.key)) msg = null // a mesma mensagem não sai duas vezes no dia
      msg = msg || status(s, now, L, used)
      // marca o horário como usado mesmo sem mensagem, para não tentar de novo
      await q(`insert into notif_log (user_id, kind, dedupe, title, body, ok) values ($1, 'coach', $2, $3, $4, false) on conflict do nothing`, [r.id, slotKey, msg?.title || '-', msg?.body || '-'])
      used.add(`slot${sl.id}`)
      if (!msg) continue
      {
        await q(`insert into notif_log (user_id, kind, dedupe, title, body, ok) values ($1, 'coach-key', $2, '-', '-', true) on conflict do nothing`, [r.id, `c:${now.date}:${msg.key}`])
        used.add(msg.key)
      }
      const open = msg.key === 'ask' || msg.key === 'go' || msg.key.startsWith('chase') ? 'coach' : msg.key.startsWith('water') ? 'agua' : msg.key === 'lunch' || msg.key.startsWith('cardio') ? 'dia' : { checkin: 'checkin', late: 'checkin', train: 'plano', weekly: 'semanal', wake: 'dia' }[msg.key] || (msg.key.startsWith('meal') || msg.key.startsWith('task') || msg.key === 'st:missed' ? 'dia' : msg.key === 'st:promise' ? 'promessas' : msg.key === 'st:cardio' || msg.key === 'st:trainweek' ? 'plano' : msg.key === 'st:pace' ? 'evolucao' : 'inicio')
      await sendToUser(r.id, { title: msg.title, body: msg.body, kind: 'rotina', dedupe: `${slotKey}:send`, url: `/?abrir=${open}` })
      used.add(`slot${sl.id}:send`)
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
