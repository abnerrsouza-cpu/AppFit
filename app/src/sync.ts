// Sincroniza os dados com o servidor e manda a agenda de cobranças dos próximos 7 dias,
// que o servidor usa para enviar as notificações no horário, com o app fechado.
import { api } from './api'
import { getLang } from './i18n'
import { testMessages } from './notify'
import { dailySchedule } from './psych'
import { type AppState, addDays, blankProfile, getState, pad, setState, subscribe, ymd } from './store'

function buildSchedule(s: AppState) {
  if (!s.onboarded) return []
  const out: { date: string; time: string; moment: string; title: string; body: string }[] = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = addDays(now, i)
    for (const n of dailySchedule(s, d)) out.push({ date: ymd(d), time: n.time, moment: n.moment, title: n.title, body: n.body })
  }
  // modo teste: uma cobrança a cada N minutos nas próximas 3 horas
  if (s.testEvery) {
    const msgs = testMessages()
    for (let k = 1; k <= Math.floor(180 / s.testEvery); k++) {
      const t = new Date(now.getTime() + k * s.testEvery * 60_000)
      const m = msgs[k % msgs.length]
      out.push({ date: ymd(t), time: `${pad(t.getHours())}:${pad(t.getMinutes())}`, moment: `teste${k}`, title: m.title, body: m.body })
    }
  }
  return out
}

let timer = 0
let lastJson = ''
async function push() {
  const s = getState()
  const json = JSON.stringify(s)
  if (json === lastJson) return
  try {
    await api.putState(s, buildSchedule(s))
    lastJson = json
  } catch {
    /* tenta de novo na próxima mudança */
  }
}

/** Carrega os dados da conta e passa a salvar cada mudança no servidor. */
export async function startSync(userName: string) {
  const local = getState()
  try {
    const { data } = await api.getState()
    if (data && typeof data === 'object') {
      setState(() => ({ ...(data as AppState), lang: local.lang ?? (data as AppState).lang, demo: false }))
    } else {
      // conta nova: começa do zero com o nome da conta
      setState(() => ({
        demo: false,
        onboarded: false,
        profile: { ...blankProfile(getLang()), name: userName },
        daily: {},
        weekly: {},
        checks: {},
        theme: local.theme,
        lang: local.lang,
      }))
    }
  } catch {
    /* sem conexão: segue com o que está no aparelho */
  }
  lastJson = ''
  void push()
  subscribe(() => {
    clearTimeout(timer)
    timer = window.setTimeout(push, 1500)
  })
  // a agenda "anda" com o tempo: reenvia a cada 6 horas e ao voltar para o app
  setInterval(() => {
    lastJson = ''
    void push()
  }, 6 * 3600_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      lastJson = ''
      void push()
    }
  })
}
