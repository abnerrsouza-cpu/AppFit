// Conversa com o treinador num dia em que a pessoa ainda não treinou.
// Pouco texto e botões grandes: a pessoa está desmotivada. O objetivo é um passo pequeno agora.
// Com IA no servidor, as respostas escritas pela pessoa são respondidas pela IA; sem IA, um roteiro pronto.
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { t } from '../i18n'
import { type AppState, addDays, coachStyle, cycleInfo, getProjeto, hasTrainPlan, setState, streak, today, workoutFor, ymd } from '../store'
import { useRefPhoto } from '../usePhotos'
import { Icon } from './Icon'
import { toast } from './Toast'

type Msg = { from: 'coach' | 'me'; text: string }
type Opt = { label: string; go: () => void }
type Obj = 'cansado' | 'tempo' | 'vontade' | 'dor' | 'cabeca' | 'outro'

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Próximos horários redondos (de 30 em 30) a partir de agora. */
function nextTimes(n = 3) {
  const d = new Date()
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0)
  const out: string[] = []
  for (let i = 0; i < n && d.getHours() < 23; i++) {
    out.push(hhmm(d))
    d.setMinutes(d.getMinutes() + 60)
  }
  return out
}

/** Abre sozinha? Dia de treino (ou sem ficha), treino ainda não feito, e o horário não marcado ou já passou. */
export function coachShouldOpen(s: AppState) {
  if (s.firstRun) return false
  if (!s.onboarded || s.demo) return false
  const p = s.profile
  const hasPlan = hasTrainPlan(p)
  if (hasPlan && !workoutFor(p, new Date())) return false
  const c = s.checks[today()] || {}
  if (c.train || c.gym || s.daily[today()]) return false
  const now = new Date()
  if (now.getHours() < 9 || now.getHours() >= 23) return false
  if (s.coachAt && Date.now() - s.coachAt < 3 * 3600_000) return false
  const at = s.trainAt?.[today()]
  if (!at) return true
  const [h, m] = at.split(':').map(Number)
  return now.getHours() * 60 + now.getMinutes() > h * 60 + m + 15
}

export function CoachChat({ s, onClose, online }: { s: AppState; onClose: () => void; online: boolean }) {
  const p = s.profile
  const first = (p.name || '').split(' ')[0] || t('você')
  const st = streak(s)
  const vet = st >= 7
  const style = coachStyle(p, st)
  const pj = getProjeto(s)
  const why = pj.vision.why?.trim()
  const ref = useRefPhoto(s)
  const wk = workoutFor(p, new Date())
  const at = s.trainAt?.[today()]

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [opts, setOpts] = useState<Opt[]>([])
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const [ai, setAi] = useState(false)
  const tries = useRef(0)
  const objection = useRef<Obj | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setState((x) => ({ ...x, coachAt: Date.now() }))
    if (online) api.coachReady().then((r) => setAi(r.ready), () => {})
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing, opts])

  // ---------- falas ----------
  const say = async (lines: string[], next: Opt[] = []) => {
    setOpts([])
    for (const l of lines) {
      setTyping(true)
      await new Promise((r) => setTimeout(r, 650 + Math.min(1200, l.length * 14)))
      setTyping(false)
      setMsgs((m) => [...m, { from: 'coach', text: l }])
    }
    setOpts(next)
  }
  const me = (txt: string) => setMsgs((m) => [...m, { from: 'me', text: txt }])

  const setTime = (h: string, day = today()) => setState((x) => ({ ...x, trainAt: { ...(x.trainAt || {}), [day]: h } }))
  const arrived = () => {
    setState((x) => ({ ...x, checks: { ...x.checks, [today()]: { ...(x.checks[today()] || {}), gym: true } } }))
    toast(t('Missão do dia cumprida'), t('Agora é só treinar. Você já venceu a parte mais difícil.'))
  }

  // ---------- roteiro ----------
  function start() {
    if (at) {
      const [h, m] = at.split(':').map(Number)
      const late = new Date().getHours() * 60 + new Date().getMinutes() > h * 60 + m + 15
      if (late) return say([t('Era pra ser às {h}, {n}.', { h: at, n: first }), t('Ainda dá tempo. O que está pegando?')], objectionOpts())
      return say([t('Treino hoje às {h}. Tô contando com você, {n}.', { h: at, n: first })], [
        { label: t('Tô indo'), go: () => (me(t('Tô indo')), going()) },
        { label: t('Mudou o horário'), go: () => (me(t('Mudou o horário')), askTime()) },
        { label: t('Não vou conseguir'), go: () => (me(t('Não vou conseguir')), why_()) },
      ])
    }
    const hello = vet
      ? t('{n}, são {d} dias seguidos. Hoje ainda não conta.', { n: first, d: st })
      : style === 'serio'
        ? t('{n}, projeto é para seguir à risca. Hoje ainda não conta.', { n: first })
        : style === 'leve'
          ? t('Oi, {n}. Sem pressão: hoje a gente só precisa dar o primeiro passo.', { n: first })
          : t('Oi, {n}. Hoje ainda não conta.', { n: first })
    say([hello, wk ? t('Que horas você vai treinar hoje? Não achei no seu dia.') : t('Que horas você vai se mexer hoje?')], timeOpts())
  }
  function timeOpts(): Opt[] {
    return [
      { label: t('Agora'), go: () => (me(t('Agora')), setTime(hhmm(new Date())), going()) },
      ...nextTimes(3).map((h) => ({ label: h, go: () => (me(h), setTime(h), scheduled(h)) })),
      { label: t('Hoje não vou'), go: () => (me(t('Hoje não vou')), why_()) },
    ]
  }
  function askTime() {
    say([t('Fechado. Que horas, então?')], timeOpts())
  }
  function scheduled(h: string) {
    say([t('Combinado: {h}. Te chamo 1 hora antes.', { h }), t('Até lá, deixa a roupa de treino separada. Isso já é metade do caminho.')], [
      { label: t('Fechado'), go: onClose },
    ])
  }
  function going() {
    say([t('Isso.'), t('Pensa só nos próximos 5 minutos: roupa, garrafa, porta.'), t('Missão de hoje: chegar na academia.')], [
      { label: t('Cheguei na academia'), go: () => (me(t('Cheguei na academia')), arrived(), done()) },
      { label: t('Tô a caminho'), go: onClose },
    ])
  }
  function done() {
    say([vet ? t('É isso. Mais um dia para a sequência.') : t('Viu? O mais difícil era sair de casa. Agora é só treinar.')], [{ label: t('Bora'), go: onClose }])
  }
  function why_() {
    tries.current = 0
    say([t('Tudo bem ser sincero comigo.'), t('O que está te travando hoje?')], objectionOpts())
  }
  function objectionOpts(): Opt[] {
    const o = (k: Obj, l: string): Opt => ({ label: l, go: () => (me(l), refute(k)) })
    return [o('cansado', t('Tô cansado')), o('tempo', t('Sem tempo')), o('vontade', t('Sem vontade')), o('dor', t('Dor ou lesão')), o('cabeca', t('Cabeça ruim')), o('outro', t('Outro motivo'))]
  }

  const REFUTE: Record<Exclude<Obj, 'dor' | 'outro'>, [string[], string[]]> = {
    cansado: [
      [vet ? t('Cansado você já estava em vários desses {d} dias. E foi mesmo assim.', { d: st }) : t('Cansaço de corpo parado melhora com movimento.'), t('Faz só 20 minutos. Se depois de 20 quiser ir embora, pode. Combinado?')],
      [t('A preguiça sempre fala mais alto no sofá do que na academia.'), t('Veste a roupa de treino. Só isso. Topa?')],
    ],
    tempo: [
      [t('Não precisa de 1 hora. 25 minutos bem feitos valem mais que nenhum.'), t('Você tem 25 minutos hoje?')],
      [t('Você achou tempo para o celular hoje. Dá para achar 25 minutos para você.'), t('Escolhe um horário e eu te cobro. Topa?')],
    ],
    vontade: [
      [t('Vontade não vem antes. Ela vem depois que você começa.'), vet ? t('Você não chegou até aqui por vontade. Foi por decisão. Decide de novo hoje?') : t('Só sai de casa. Se chegar lá e não quiser, volta. Combinado?')],
      [t('Ninguém se arrepende do treino que fez. Só do que pulou.'), t('Faz o mínimo hoje. Topa?')],
    ],
    cabeca: [
      [t('Treino é dos poucos remédios que funcionam rápido para a cabeça.'), t('20 minutos e você volta melhor do que saiu. Topa ir só para ver?')],
      [t('Não precisa ser pesado. Uma caminhada já mexe com a cabeça.'), t('Bora 15 minutos de caminhada?')],
    ],
  }
  function refute(k: Obj) {
    objection.current = k
    if (k === 'dor')
      return say([t('Com dor, não força. Descanso também faz parte do plano.'), t('Se der, faz 10 minutos de alongamento ou uma caminhada leve. Se a dor for forte, procure um profissional.')], [
        { label: t('Vou fazer algo leve'), go: () => (me(t('Vou fazer algo leve')), say([t('Perfeito. Movimento leve hoje, treino forte quando melhorar.')], [{ label: t('Fechado'), go: onClose }])) },
        { label: t('Vou descansar'), go: () => (me(t('Vou descansar')), tomorrow()) },
      ])
    if (k === 'outro') {
      setOpts([])
      return say([t('Me conta com as suas palavras. Escreve aqui embaixo.')], [])
    }
    const lines = REFUTE[k][Math.min(tries.current, 1)]
    say(lines, [
      { label: t('Beleza, eu vou'), go: () => (me(t('Beleza, eu vou')), going()) },
      { label: t('Ainda não'), go: () => (me(t('Ainda não')), again()) },
    ])
  }
  function again() {
    tries.current++
    const k = objection.current
    if (tries.current === 1 && k && k !== 'dor' && k !== 'outro') return refute(k)
    if (tries.current <= 2)
      return say([t('Então faz o mínimo: 15 minutos de qualquer coisa. Caminhada conta.')], [
        { label: t('Isso eu faço'), go: () => (me(t('Isso eu faço')), say([t('É assim que se constrói. O mínimo, todo dia.')], [{ label: t('Bora'), go: onClose }])) },
        { label: t('Hoje não'), go: () => (me(t('Hoje não')), tomorrow()) },
      ])
    tomorrow()
  }
  function tomorrow() {
    const tm = ymd(addDays(new Date(), 1))
    const lines = [t('Ok. Não vou fingir que está tudo bem, mas um dia não define você.')]
    if (why) lines.push(t('Lembra por que você começou: "{w}"', { w: why }))
    lines.push(t('Que horas você treina amanhã?'))
    say(lines, ['07:00', '12:00', '18:00', '19:30'].map((h) => ({ label: h, go: () => (me(h), setTime(h, tm), say([t('Anotado: amanhã às {h}. Te cobro.', { h })], [{ label: t('Fechado'), go: onClose }])) })))
  }

  // ---------- texto livre (IA quando disponível) ----------
  const send = async () => {
    const txt = text.trim()
    if (!txt) return
    setText('')
    me(txt)
    setOpts([])
    if (ai) {
      setTyping(true)
      try {
        const c = cycleInfo(p)
        const history = [...msgs, { from: 'me', text: txt }].map((m) => ({ role: m.from === 'me' ? ('user' as const) : ('assistant' as const), text: m.text }))
        const r = await api.coachChat({ name: first, streak: st, day: c.day, cycle: p.cycleDays, workout: wk?.title || '', trainAt: at || '', why: why || '', letter: p.letter.slice(0, 300), tone: p.tone, lang: s.lang || 'pt', style, moment: p.moment || '' }, history)
        setTyping(false)
        if (r.text) {
          setMsgs((m) => [...m, { from: 'coach', text: r.text! }])
          setOpts([
            { label: t('Beleza, eu vou'), go: () => (me(t('Beleza, eu vou')), going()) },
            { label: t('Hoje não'), go: () => (me(t('Hoje não')), tomorrow()) },
          ])
          return
        }
      } catch {
        setTyping(false)
      }
    }
    // sem IA: entende por palavras e responde com o roteiro
    const l = txt.toLowerCase()
    const k: Obj = /dor|les|machuc|pain|injur|dolor/.test(l) ? 'dor' : /cans|sono|tired|exhaust|cansad/.test(l) ? 'cansado' : /tempo|trabalh|corrid|time|busy|work|tiempo|trabaj/.test(l) ? 'tempo' : /trist|ansie|depre|sad|anx|cabe/.test(l) ? 'cabeca' : 'vontade'
    refute(k)
  }

  return (
    <div className="cc" role="dialog" aria-modal="true">
      <div className="cc-top" style={ref ? { backgroundImage: `linear-gradient(180deg, rgba(5,10,25,.2), rgba(5,10,25,.9)), url(${ref})` } : undefined}>
        <button type="button" className="cc-x" onClick={onClose} aria-label={t('Fechar')}>
          <Icon name="x" size={20} />
        </button>
        <span className="coach-av lg">
          <Icon name="flame" size={24} />
        </span>
        <b>{t('Seu treinador')}</b>
        <small>{t('Missão de hoje: chegar na academia')}</small>
      </div>
      <div className="cc-body" ref={box}>
        {msgs.map((m, i) => (
          <div key={i} className={`cc-msg ${m.from}`}>
            {m.text}
          </div>
        ))}
        {typing && <div className="cc-msg coach typing">•••</div>}
      </div>
      <div className="cc-foot">
        {opts.length > 0 && (
          <div className="cc-opts">
            {opts.map((o) => (
              <button key={o.label} type="button" className="cc-opt" onClick={o.go}>
                {o.label}
              </button>
            ))}
          </div>
        )}
        <form
          className="cc-input"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Ou escreva o que está sentindo...')} />
          <button type="submit" aria-label={t('Enviar')} disabled={!text.trim()}>
            <Icon name="arrow" size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
