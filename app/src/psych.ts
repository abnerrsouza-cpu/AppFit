// Motor de cobrança. Regra de ouro: cobrar ATITUDE, nunca o CORPO.
// Gatilhos usados: custo afundado, aversão à perda (sequência), identidade,
// compromisso escrito (a carta) e honestidade consigo mesmo.
import {
  type AppState,
  type DailyLog,
  type Tone,
  cycleInfo,
  defaultCustom,
  streak,
  today,
  workoutFor,
} from './store'

import { t } from './i18n'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export type Moment =
  | 'acordar'
  | 'refeicao'
  | 'treino'
  | 'checkin'
  | 'checkin_atrasado'
  | 'semanal'
  | 'geral'

export interface Nudge {
  moment: Moment
  time: string
  title: string
  body: string
}

function ctx(s: AppState) {
  const p = s.profile
  const c = cycleInfo(p)
  const st = streak(s)
  const quote = firstSentence(p.letter)
  return {
    nome: p.name || t('você'),
    pago: brl(p.price),
    custoDia: brl(c.costPerDay),
    diasRestantes: c.left,
    diaAtual: c.day,
    ciclo: p.cycleDays,
    streak: st,
    carta: quote,
  }
}

function firstSentence(txt: string) {
  const s = (txt || '').trim().split(/(?<=[.!?])\s/)[0]
  return s || t('Eu prometi que dessa vez ia ser diferente.')
}

type Bank = Record<Tone, string[]>
type C = ReturnType<typeof ctx>

const fill = (tpl: string, c: C, extra: Record<string, string> = {}) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => String(extra[k] ?? (c as unknown as Record<string, string | number>)[k] ?? ''))

const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length]
const daySeed = () => {
  const d = new Date()
  return d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()
}

const BANK: Record<Moment, Bank> = {
  acordar: {
    parceiro: [
      'Bom dia, {nome}. Dia {diaAtual} de {ciclo}. Hoje é mais um tijolo na sua obra.',
      'Você escreveu: "{carta}" Bora honrar isso hoje?',
    ],
    treinador: [
      'Dia {diaAtual} de {ciclo}. Faltam {diasRestantes}. Cada dia vale {custoDia}. Não jogue fora o de hoje.',
      '{nome}, sua sequência está em {streak} dias. Ela não se protege sozinha.',
    ],
    sargento: [
      'Levanta. Ninguém vai fazer por você. Dia {diaAtual}. Sem desculpa.',
      'Você pagou {pago} pra ser cobrado. Então ouve: hoje você cumpre o plano inteiro.',
    ],
  },
  refeicao: {
    parceiro: ['Hora de {refeicao}: {itens}. Comer o que está no plano é um carinho com você mesmo.'],
    treinador: ['{refeicao} agora: {itens}. Seguiu? À noite você vai ter que contar.'],
    sargento: ['{refeicao}. {itens}. Não é sugestão. É o plano que você aceitou.'],
  },
  treino: {
    parceiro: ['Seu treino de hoje é {treino}. Vai lá, mesmo que seja a versão curta.'],
    treinador: ['{treino} às {hora}. Gente disciplinada não negocia com a preguiça. Qual das duas você é hoje?'],
    sargento: [
      '{treino}. Agora. A vontade não vem antes. Ela vem depois que você começa.',
      'Pular o {treino} hoje é escolher ser a mesma pessoa de sempre. Você pagou pra mudar.',
    ],
  },
  checkin: {
    parceiro: ['Hora de prestar contas do dia, {nome}. Leva 2 minutos. Seja sincero, é só você aqui.'],
    treinador: [
      'Prestação de contas. Ninguém vê isso além de você. Mentir aqui é mentir pra você mesmo.',
      'Você pagou {pago} e só você usa. Esconder informação é se enganar.',
    ],
    sargento: ['Hora da verdade. Abre e conta como foi. Tudo. Inclusive o que você queria esconder.'],
  },
  checkin_atrasado: {
    parceiro: ['Você ainda não contou como foi seu dia. Sua sequência de {streak} dias está esperando.'],
    treinador: [
      'São {hora} e nada de prestação de contas. {streak} dias de sequência vão virar zero à meia-noite.',
      'Quem some no check-in normalmente está fugindo de alguma coisa. O que foi hoje?',
    ],
    sargento: [
      'Sumiu? Isso tem nome: fuga. Você tem até meia-noite pra salvar {streak} dias.',
      'Hoje vale {custoDia}. Do jeito que está indo, foi dinheiro jogado fora.',
    ],
  },
  semanal: {
    parceiro: ['Fim de semana: hora da foto e do peso. Ver a evolução é o melhor combustível.'],
    treinador: ['Check-in semanal. Foto, peso e a verdade sobre a semana. Faltam {diasRestantes} dias.'],
    sargento: ['Foto da semana. Sem filtro, sem ângulo esperto. Você quer a verdade ou um consolo?'],
  },
  geral: {
    parceiro: ['Você não precisa de motivação, precisa de constância. Um dia de cada vez.'],
    treinador: [
      'A dor da disciplina pesa gramas. A do arrependimento pesa toneladas.',
      'Ninguém vai lembrar do seu dia ruim. Vão lembrar se você desistiu.',
    ],
    sargento: ['Seu "eu do futuro" está assistindo. Ele está orgulhoso ou com vergonha?'],
  },
}

const NO_STREAK: Record<Tone, string> = {
  parceiro: 'Hoje pode ser o dia 1 da sua sequência. Ela só começa quando você presta contas.',
  treinador: 'Sua sequência está em zero. O dia 1 começa com a prestação de contas de hoje.',
  sargento: 'Zero dias de sequência. Zero. Presta contas hoje e para de começar do nada.',
}

export function nudge(s: AppState, moment: Moment, extra: Record<string, string> = {}, seed = daySeed()): string {
  const c = ctx(s)
  // sem sequência, falar em "salvar 0 dias" não faz sentido
  if ((moment === 'checkin_atrasado' || moment === 'acordar') && c.streak === 0 && /\{streak\}/.test(pick(BANK[moment][s.profile.tone], seed)))
    return fill(t(NO_STREAK[s.profile.tone]), c, extra)
  return fill(t(pick(BANK[moment][s.profile.tone], seed)), c, extra)
}

const TITLES: Record<Moment, string> = {
  acordar: 'Bom dia',
  refeicao: 'Refeição',
  treino: 'Treino',
  checkin: 'Prestação de contas',
  checkin_atrasado: 'Você está devendo',
  semanal: 'Check-in semanal',
  geral: 'Lembrete',
}

/** Agenda de cobranças de um dia. É a mesma lista que vira notificação. */
export function dailySchedule(s: AppState, d = new Date()): Nudge[] {
  const p = s.profile
  const list: Nudge[] = []
  const add = (moment: Moment, time: string, extra: Record<string, string> = {}, title?: string) =>
    list.push({ moment, time, title: title ?? t(TITLES[moment]), body: nudge(s, moment, { hora: time, ...extra }) })

  add('acordar', p.wake)
  p.meals.forEach((m) => add('refeicao', m.time, { refeicao: m.name, itens: m.items || t('o que está no plano') }, m.name))
  const w = workoutFor(p, d)
  if (w) {
    const [h, mi] = p.trainTime.split(':').map(Number)
    const pre = `${String(Math.max(0, h - 1)).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
    add('treino', pre, { treino: w.title, hora: p.trainTime }, `${t('Treino')}: ${w.title}`)
  }
  add('checkin', p.checkinTime)
  const [ch, cm] = p.checkinTime.split(':').map(Number)
  const late = `${String(Math.min(23, ch + 1)).padStart(2, '0')}:${String(cm).padStart(2, '0')}`
  add('checkin_atrasado', late)
  if (d.getDay() === 0) add('semanal', '10:00')
  for (const c of s.custom ?? defaultCustom()) if (c.on && c.text.trim()) list.push({ moment: 'geral', time: c.time, title: t('Recado seu'), body: c.text })
  return list.sort((a, b) => a.time.localeCompare(b.time))
}

/** Frase do momento para o topo da tela inicial. */
export function headline(s: AppState): string {
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const done = !!s.daily[today()]
  if (done) return feedbackShort(s, s.daily[today()])
  if (hhmm >= s.profile.checkinTime) return nudge(s, 'checkin_atrasado', { hora: hhmm })
  const past = dailySchedule(s).filter((n) => n.time <= hhmm && n.moment !== 'checkin_atrasado')
  return past.length ? past[past.length - 1].body : nudge(s, 'geral')
}

function feedbackShort(s: AppState, l: DailyLog) {
  const r = feedback(s, l)
  return r.title
}

/** Resposta depois da prestação de contas. Elogia o que foi cumprido, cobra o que não foi. */
export function feedback(s: AppState, l: DailyLog): { title: string; body: string; level: 'good' | 'warn' | 'bad' } {
  const tone = s.profile.tone
  const c = ctx(s)
  const score =
    (l.trained === 'sim' || l.trained === 'descanso' ? 4 : l.trained === 'parcial' ? 2 : 0) +
    (l.dietScore / 10) * 4 +
    (l.cardioMin > 0 ? 1 : 0) +
    (l.focus >= 7 ? 1 : 0)

  if (score >= 8) {
    return {
      level: 'good',
      title: t({ parceiro: 'Dia cumprido. Orgulho de você.', treinador: 'Dia pago. Isso é disciplina.', sargento: 'Cumpriu. Não fez mais que a obrigação. Amanhã de novo.' }[tone]),
      body: fill(t('Sequência: {streak} dias. Faltam {diasRestantes}. O {custoDia} de hoje foi bem investido.'), c),
    }
  }
  if (score >= 5) {
    return {
      level: 'warn',
      title: t({ parceiro: 'Dia ok. Dá pra apertar amanhã.', treinador: 'Meio-termo não muda corpo nenhum.', sargento: 'Meia boca. E meia boca é o que te trouxe até aqui.' }[tone]),
      body:
        l.trained === 'nao'
          ? t('Faltou o treino. Amanhã ele vem primeiro, antes de qualquer desculpa aparecer.')
          : fill(t('A dieta ficou em {nota}/10. Qual foi o momento exato em que você furou? Anota e evita amanhã.'), c, { nota: String(l.dietScore) }),
    }
  }
  return {
    level: 'bad',
    title: t({ parceiro: 'Dia difícil. Acontece, mas não vira hábito.', treinador: 'Hoje você perdeu pra você mesmo.', sargento: 'Hoje foi dinheiro jogado fora.' }[tone]),
    body: fill(t('Você escreveu: "{carta}" Pelo menos foi sincero, e isso conta. Amanhã é o dia de provar que hoje foi exceção.'), c),
  }
}

export const toneLabel = (): Record<Tone, { name: string; desc: string }> => ({
  parceiro: { name: t('Parceiro'), desc: t('Firme, mas gentil') },
  treinador: { name: t('Treinador'), desc: t('Direto, sem enrolação') },
  sargento: { name: t('Sargento'), desc: t('Brutal. Só pra quem aguenta') },
})
