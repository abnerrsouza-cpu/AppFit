// Estado do app. No MVP fica no localStorage do aparelho.
// Na versão com servidor, troca-se este arquivo por chamadas ao Supabase.
import { useEffect, useState } from 'react'

export type Tone = 'parceiro' | 'treinador' | 'sargento'

export interface Meal {
  id: string
  time: string // "07:30"
  name: string
  items: string
}

export interface WorkoutDay {
  weekday: number // 0 = domingo
  title: string
  items: string
}

export interface Profile {
  name: string
  age: number
  height: number // cm
  weightStart: number
  weightGoal: number
  goal: string
  wake: string
  trainTime: string
  sleep: string
  checkinTime: string
  tone: Tone
  letter: string
  startDate: string // yyyy-mm-dd
  price: number
  cycleDays: number
  icalUrl: string
  cardioGoalMin: number // por semana
  meals: Meal[]
  workouts: WorkoutDay[]
}

export type Trained = 'sim' | 'parcial' | 'nao' | 'descanso'

export interface DailyLog {
  date: string
  trained: Trained
  cardioMin: number
  cardioType: string
  dietScore: number // 0-10
  mealsOk: Record<string, boolean>
  ate: string
  focus: number // 0-10
  water: number // litros
  sleepH: number
  dayNote: string
  submittedAt: string
}

export interface WeeklyLog {
  weekStart: string
  weight: number
  waist: number
  photoId?: string
  dietRate: number // 1-5
  trainRate: number
  cardioRate: number
  win: string
  fail: string
  commit: string
  submittedAt: string
}

export interface AppState {
  demo: boolean
  onboarded: boolean
  profile: Profile
  daily: Record<string, DailyLog>
  weekly: Record<string, WeeklyLog>
  checks: Record<string, Record<string, boolean>> // tarefas do dia marcadas
  theme: 'dark' | 'light'
  custom?: CustomNudge[] // cobranças escritas pelo próprio usuário
  testEvery?: number // modo teste: dispara a cada N minutos (0 = desligado)
  projeto?: Projeto
}

export interface CustomNudge {
  id: string
  time: string
  text: string
  on: boolean
}

export interface Promise_ {
  id: string
  text: string
  date: string
  status: 'aberta' | 'cumprida' | 'quebrada'
}
export interface Vent {
  id: string
  date: string
  mood: string
  text: string
}
export interface Goal {
  id: string
  emoji: string
  title: string
  due: string
  done: boolean
}
export interface Vision {
  result: string
  feeling: string
  why: string
  photoId?: string
  targetDate: string
}
export interface GalleryPhoto {
  id: string
  photoId: string
  caption: string
  date: string
}
export interface Projeto {
  promises: Promise_[]
  vents: Vent[]
  goals: Goal[]
  vision: Vision
  photos: GalleryPhoto[]
}

export function blankProjeto(startDate: string, cycleDays: number): Projeto {
  return {
    promises: [],
    vents: [],
    goals: [],
    vision: { result: '', feeling: '', why: '', targetDate: ymd(addDays(parseYmd(startDate), cycleDays)) },
    photos: [],
  }
}

export const defaultCustom = (): CustomNudge[] => [{ id: 'bora-filho', time: '20:00', text: 'Treinou hoje? Bora, filho!', on: true }]

export function getProjeto(s: AppState): Projeto {
  return s.projeto ?? blankProjeto(s.profile.startDate, s.profile.cycleDays)
}
export function setProjeto(fn: (p: Projeto) => Projeto) {
  setState((s) => ({ ...s, projeto: fn(getProjeto(s)) }))
}

// ---------- datas ----------
export const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (d: Date, n: number) => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}
export const today = () => ymd(new Date())
export const weekStartOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7)) // segunda
export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
export const fmtDayMonth = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
export const daysBetween = (a: Date, b: Date) =>
  Math.round((parseYmd(ymd(b)).getTime() - parseYmd(ymd(a)).getTime()) / 86400000)

// ---------- dados de exemplo ----------
const uid = () => Math.random().toString(36).slice(2, 9)

export function blankProfile(): Profile {
  return {
    name: '',
    age: 30,
    height: 175,
    weightStart: 85,
    weightGoal: 78,
    goal: 'Perder gordura',
    wake: '06:30',
    trainTime: '18:30',
    sleep: '23:00',
    checkinTime: '21:30',
    tone: 'treinador',
    letter: '',
    startDate: today(),
    price: 49.9,
    cycleDays: 90,
    icalUrl: '',
    cardioGoalMin: 150,
    meals: [
      { id: uid(), time: '07:00', name: 'Café da manhã', items: '' },
      { id: uid(), time: '12:30', name: 'Almoço', items: '' },
      { id: uid(), time: '16:00', name: 'Lanche', items: '' },
      { id: uid(), time: '20:00', name: 'Jantar', items: '' },
    ],
    workouts: [
      { weekday: 1, title: 'Treino A', items: '' },
      { weekday: 2, title: 'Treino B', items: '' },
      { weekday: 3, title: 'Treino C', items: '' },
      { weekday: 4, title: 'Treino A', items: '' },
      { weekday: 5, title: 'Treino B', items: '' },
    ],
  }
}

function demoState(): AppState {
  const now = new Date()
  const start = addDays(now, -37)
  const profile: Profile = {
    ...blankProfile(),
    name: 'Abner',
    age: 29,
    height: 178,
    weightStart: 88.4,
    weightGoal: 80,
    goal: 'Perder gordura e ganhar definição',
    startDate: ymd(start),
    letter:
      'Cansei de me esconder em foto. Daqui a 90 dias eu quero tirar a camisa na praia sem pensar duas vezes. Eu sei que consigo, só preciso parar de negociar comigo mesmo.',
    meals: [
      { id: 'm1', time: '07:00', name: 'Café da manhã', items: '3 ovos mexidos, 1 pão integral, café sem açúcar' },
      { id: 'm2', time: '12:30', name: 'Almoço', items: '150g frango, 120g arroz, feijão, salada à vontade' },
      { id: 'm3', time: '16:00', name: 'Lanche', items: 'Iogurte natural + 1 scoop whey + 1 banana' },
      { id: 'm4', time: '20:00', name: 'Jantar', items: '150g carne magra, 200g batata-doce, legumes' },
    ],
    workouts: [
      { weekday: 1, title: 'Peito e tríceps', items: 'Supino reto 4x10\nSupino inclinado halter 3x12\nCrucifixo 3x12\nTríceps corda 4x12\nTríceps francês 3x10' },
      { weekday: 2, title: 'Costas e bíceps', items: 'Puxada frente 4x10\nRemada curvada 4x10\nRemada baixa 3x12\nRosca direta 4x10\nRosca martelo 3x12' },
      { weekday: 3, title: 'Pernas', items: 'Agachamento 4x8\nLeg press 4x12\nCadeira extensora 3x15\nStiff 4x10\nPanturrilha 4x15' },
      { weekday: 4, title: 'Ombros e abdômen', items: 'Desenvolvimento 4x10\nElevação lateral 4x12\nCrucifixo inverso 3x12\nAbdominal infra 4x15\nPrancha 3x45s' },
      { weekday: 5, title: 'Full body + cardio', items: 'Agachamento 3x10\nSupino 3x10\nRemada 3x10\nEsteira inclinada 25 min' },
    ],
  }

  const daily: Record<string, DailyLog> = {}
  // 37 dias de histórico, com alguns furos para dar realismo
  const seed = [9, 8, 7, 9, 6, 8, 10, 7, 5, 8, 9, 9, 6, 8, 7, 9, 8, 4, 7, 8, 9, 9, 8, 7, 6, 9, 8, 9, 7, 8, 9, 6, 8, 9, 7, 8, 9]
  for (let i = 37; i >= 1; i--) {
    const d = addDays(now, -i)
    const key = ymd(d)
    if (i === 15 || i === 16) continue // dois dias sem check-in
    const wd = d.getDay()
    const hasWorkout = wd >= 1 && wd <= 5
    const s = seed[37 - i]
    daily[key] = {
      date: key,
      trained: !hasWorkout ? 'descanso' : s <= 5 ? 'nao' : s === 6 ? 'parcial' : 'sim',
      cardioMin: wd === 0 ? 0 : [20, 30, 25, 0, 40, 30, 35][wd],
      cardioType: wd === 6 ? 'Bike' : 'Esteira',
      dietScore: s,
      mealsOk: { m1: true, m2: s > 5, m3: s > 6, m4: s > 7 },
      ate: s > 7 ? 'Segui o plano.' : 'Furei no jantar, pedi lanche.',
      focus: Math.min(10, s + 1),
      water: s > 6 ? 3 : 2,
      sleepH: s > 6 ? 7.5 : 6,
      dayNote: '',
      submittedAt: key + 'T21:40',
    }
  }

  const weekly: Record<string, WeeklyLog> = {}
  const ws0 = weekStartOf(start)
  const weights = [88.4, 87.6, 86.9, 86.5, 85.7, 85.3]
  for (let w = 0; w < 6; w++) {
    const wsd = addDays(ws0, w * 7)
    if (wsd > now) break
    const key = ymd(wsd)
    weekly[key] = {
      weekStart: key,
      weight: weights[w],
      waist: 96 - w * 1.1,
      photoId: w === 0 ? 'demo-before' : w === 5 || addDays(wsd, 7) > now ? 'demo-after' : undefined,
      dietRate: 4,
      trainRate: 4,
      cardioRate: 3,
      win: 'Não faltei nenhum treino.',
      fail: 'Fim de semana foi fraco na dieta.',
      commit: 'Sábado sem delivery.',
      submittedAt: key,
    }
  }

  const projeto: Projeto = {
    promises: [
      { id: 'p1', text: 'Não vou pedir delivery no fim de semana.', date: ymd(addDays(now, -10)), status: 'cumprida' },
      { id: 'p2', text: 'Vou treinar mesmo nos dias sem vontade.', date: ymd(addDays(now, -6)), status: 'aberta' },
      { id: 'p3', text: 'Dormir antes da meia-noite de segunda a sexta.', date: ymd(addDays(now, -3)), status: 'quebrada' },
    ],
    vents: [
      { id: 'v1', date: ymd(addDays(now, -2)), mood: '😤', text: 'Hoje bateu a vontade de largar tudo. Fui treinar com raiva e saí melhor.' },
      { id: 'v2', date: ymd(addDays(now, -8)), mood: '🙂', text: 'Primeira vez que a calça antiga fechou. Pequeno, mas eu vi.' },
    ],
    goals: [
      { id: 'g1', emoji: '⚖️', title: 'Chegar a 80 kg', due: ymd(addDays(start, 90)), done: false },
      { id: 'g2', emoji: '🏃', title: 'Correr 5 km sem parar', due: ymd(addDays(now, 30)), done: false },
      { id: 'g3', emoji: '🏋️', title: 'Supino com 80 kg', due: ymd(addDays(now, 45)), done: false },
      { id: 'g4', emoji: '🥗', title: '30 dias sem refrigerante', due: ymd(addDays(now, -5)), done: true },
    ],
    vision: {
      result: 'Abdômen aparecendo, 80 kg e ombro largo.',
      feeling: 'Confiante para tirar a camisa na praia sem pensar duas vezes.',
      why: 'Quero ser exemplo em casa e parar de fugir de foto.',
      targetDate: ymd(addDays(start, 90)),
    },
    photos: [],
  }
  return { demo: true, onboarded: true, profile, daily, weekly, checks: {}, theme: 'light', custom: defaultCustom(), projeto }
}

// ---------- persistência ----------
const KEY = 'semdesculpa:v2'

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    /* sem storage: segue com exemplo */
  }
  return demoState()
}

let state: AppState = load()
const listeners = new Set<() => void>()

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignora */
  }
}

export function getState() {
  return state
}

export function setState(fn: (s: AppState) => AppState) {
  state = fn(state)
  save()
  listeners.forEach((l) => l())
}

export function resetToBlank() {
  setState(() => ({
    demo: false,
    onboarded: false,
    profile: blankProfile(),
    daily: {},
    weekly: {},
    checks: {},
    theme: state.theme,
    custom: defaultCustom(),
  }))
}

export function resetToDemo() {
  setState(() => ({ ...demoState(), theme: state.theme }))
}

export function useAppState(): AppState {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return state
}

// ---------- métricas ----------
export function cycleInfo(p: Profile) {
  const start = parseYmd(p.startDate)
  const day = Math.max(1, daysBetween(start, new Date()) + 1)
  const left = Math.max(0, p.cycleDays - day)
  const costPerDay = p.price / p.cycleDays
  return { day: Math.min(day, p.cycleDays), left, costPerDay, pct: Math.min(1, day / p.cycleDays) }
}

/** Dias seguidos com prestação de contas enviada. Hoje conta se já enviou; se não, não quebra ainda. */
export function streak(s: AppState) {
  let n = 0
  let d = new Date()
  if (!s.daily[ymd(d)]) d = addDays(d, -1)
  while (s.daily[ymd(d)]) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function weekDays(ref = new Date()) {
  const ws = weekStartOf(ref)
  return Array.from({ length: 7 }, (_, i) => addDays(ws, i))
}

export function weekStats(s: AppState, ref = new Date()) {
  const days = weekDays(ref)
  const logs = days.map((d) => s.daily[ymd(d)])
  const done = logs.filter(Boolean) as DailyLog[]
  const planned = days.filter((d) => s.profile.workouts.some((w) => w.weekday === d.getDay()) && d <= new Date()).length
  const trained = done.filter((l) => l.trained === 'sim').length + done.filter((l) => l.trained === 'parcial').length * 0.5
  const cardio = done.reduce((a, l) => a + (l.cardioMin || 0), 0)
  const diet = done.length ? done.reduce((a, l) => a + l.dietScore, 0) / done.length : 0
  const focus = done.length ? done.reduce((a, l) => a + l.focus, 0) / done.length : 0
  return { days, logs, planned, trained, cardio, diet, focus, checkins: done.length }
}

export function currentWeight(s: AppState) {
  const ws = Object.values(s.weekly).sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  return ws.length ? ws[ws.length - 1].weight : s.profile.weightStart
}

export function bmi(weight: number, heightCm: number) {
  const h = heightCm / 100
  return weight / (h * h)
}

export function workoutFor(p: Profile, d: Date) {
  return p.workouts.find((w) => w.weekday === d.getDay())
}

export const newId = uid
