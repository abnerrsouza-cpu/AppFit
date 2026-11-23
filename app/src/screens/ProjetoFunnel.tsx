// Começar projetinho: um funil de perguntas, uma por tela, com juramento de sinceridade
import { editPhoto } from '../components/PhotoEditor'
// no início e "Começar projetinho" com confete no final.
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { PhotoButtons } from '../components/PhotoButtons'
import { toast } from '../components/Toast'
import { t } from '../i18n'
import { compress, getPhoto, putPhoto } from '../photos'
import { type AppState, addDays, daysBetween, fmtDayMonth, getProjeto, newId, parseYmd, setProjeto, today, ymd } from '../store'

const STEPS = ['oath', 'photo', 'result', 'date', 'feeling', 'why', 'past', 'mood', 'goal', 'promise', 'review'] as const
type Step = (typeof STEPS)[number]

const MOODS = ['mal', 'irritado', 'triste', 'normal', 'bem', 'motivado']
const MOOD_LABEL: Record<string, string> = { mal: 'Mal', irritado: 'Irritado', triste: 'Triste', normal: 'Normal', bem: 'Bem', motivado: 'Motivado' }
const MOOD_REPLY: Record<string, string> = {
  mal: 'Começar mal também é começar. O importante é não parar.',
  irritado: 'Ótimo. Usa essa raiva como combustível.',
  triste: 'Tudo bem. A gente constrói o resto junto, um dia de cada vez.',
  normal: 'Normal é bom. Constância não precisa de empolgação.',
  bem: 'Guarda esse sentimento. Você vai precisar dele.',
  motivado: 'Aproveita. E quando a motivação acabar, é a disciplina que fica.',
}

function Chips({ list, onPick }: { list: string[]; onPick: (x: string) => void }) {
  return (
    <div className="examples">
      <small>{t('Sem ideia? Toque num exemplo:')}</small>
      <div>
        {list.map((x) => (
          <button key={x} type="button" className="ex-chip" onClick={() => onPick(t(x))}>
            {t(x)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Botão de segurar para jurar (1,5 s). */
function HoldButton({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [p, setP] = useState(0)
  const timer = useRef<number | null>(null)
  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    if (!done) setP(0)
  }
  const start = () => {
    if (done || timer.current) return
    const t0 = Date.now()
    timer.current = window.setInterval(() => {
      const v = Math.min(1, (Date.now() - t0) / 1500)
      setP(v)
      if (v >= 1) {
        stop()
        navigator.vibrate?.(60)
        onDone()
      }
    }, 30)
  }
  useEffect(() => stop, [])
  return (
    <button
      type="button"
      className={`hold-btn ${done ? 'done' : ''}`}
      style={{ ['--p' as string]: done ? 1 : p }}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-fill" />
      <span className="hold-txt">
        {done ? (
          <>
            <Icon name="check" size={20} stroke={3} /> {t('Juramento feito')}
          </>
        ) : p > 0 ? (
          t('Continue segurando...')
        ) : (
          t('Segure para jurar')
        )}
      </span>
    </button>
  )
}

export function ProjetoFunnel({ s, name, onClose, onDone }: { s: AppState; name: string; onClose: () => void; onDone: () => void }) {
  const pj = getProjeto(s)
  const [i, setI] = useState(0)
  const step: Step = STEPS[i]
  const [d, setD] = useState({
    oath: !!pj.oathAt,
    photoId: pj.vision.photoId,
    result: pj.vision.result,
    targetDate: pj.vision.targetDate,
    feeling: pj.vision.feeling,
    why: pj.vision.why,
    past: '',
    mood: '',
    goal: pj.goals[0]?.title ?? '',
    promise: '',
  })
  const set = (patch: Partial<typeof d>) => setD((x) => ({ ...x, ...patch }))
  const [photoUrl, setPhotoUrl] = useState<string>()
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    if (d.photoId) getPhoto(d.photoId).then((u) => alive && setPhotoUrl(u))
    return () => {
      alive = false
    }
  }, [d.photoId])
  useEffect(() => {
    window.scrollTo(0, 0)
    const el = document.querySelector<HTMLTextAreaElement>('.funnel textarea')
    el?.focus({ preventScroll: true })
  }, [i])

  const pick = async (raw?: File) => {
    const f = raw && (await editPhoto(raw, 3 / 4))
    if (!f) return
    setBusy(true)
    const url = await compress(f, 1100)
    const id = newId()
    await putPhoto(id, url)
    set({ photoId: id })
    setBusy(false)
    toast(t('Foto salva'))
  }

  const left = Math.max(0, daysBetween(new Date(), parseYmd(d.targetDate)))
  const goalDue = ymd(addDays(new Date(), 30))
  const firstName = name.trim().split(/\s+/)[0] || ''

  const canNext: Record<Step, boolean> = {
    oath: d.oath,
    photo: true,
    result: !!d.result.trim(),
    date: left > 0,
    feeling: !!d.feeling.trim(),
    why: !!d.why.trim(),
    past: !!d.past.trim(),
    mood: !!d.mood,
    goal: !!d.goal.trim(),
    promise: !!d.promise.trim(),
    review: true,
  }

  const finish = () => {
    const now = new Date().toISOString()
    setProjeto((p) => ({
      ...p,
      startedAt: now,
      oathAt: p.oathAt ?? now,
      vision: { ...p.vision, photoId: d.photoId, result: d.result.trim(), targetDate: d.targetDate, feeling: d.feeling.trim(), why: d.why.trim() },
      vents: d.past.trim() ? [{ id: newId(), date: today(), mood: d.mood || 'normal', text: d.past.trim() }, ...p.vents] : p.vents,
      goals: d.goal.trim() && !p.goals.some((g) => g.title === d.goal.trim()) ? [...p.goals, { id: newId(), emoji: '', title: d.goal.trim(), due: goalDue, done: false }] : p.goals,
      promises: d.promise.trim() ? [{ id: newId(), text: d.promise.trim(), date: today(), status: 'aberta' as const }, ...p.promises] : p.promises,
    }))
    onDone()
  }
  const next = () => (step === 'review' ? finish() : setI(i + 1))

  // frase de ligação: o app "responde" o que a pessoa acabou de dizer
  const coach: Partial<Record<Step, string>> = {
    photo: t('Juramento feito. Agora vamos começar pelo fim.'),
    result: d.photoId ? t('Guardei essa foto. Ela vai te encarar todo dia.') : t('Sem foto por enquanto. Dá para colocar depois.'),
    date: t('"{r}". Anotado.', { r: d.result.trim() }),
    feeling: t('Faltam {n} dias. Dá tempo, se você não parar.', { n: left }),
    why: t('Guarda esse sentimento.'),
    past: t('Esse é o seu motivo. Vou te lembrar dele nos dias difíceis.'),
    mood: t('Obrigado por ser sincero. Isso já é diferente das outras vezes.'),
    goal: d.mood ? t(MOOD_REPLY[d.mood]) : '',
    promise: t('Meta criada para {d}.', { d: fmtDayMonth(parseYmd(goalDue)) }),
    review: t('Pronto. Olha o que você montou:'),
  }

  return (
    <div className="funnel" role="dialog" aria-modal="true">
      <div className="sheet story">
        <div className="story-bars" aria-label={t('Pergunta {a} de {b}', { a: i + 1, b: STEPS.length })}>
          {STEPS.map((x, k) => (
            <i key={x} className={k <= i ? 'on' : ''} />
          ))}
        </div>
        <div className="sheet-h">
          <button type="button" className="round-btn" onClick={i ? () => setI(i - 1) : onClose} aria-label={i ? t('Voltar') : t('Fechar')}>
            <Icon name={i ? 'back' : 'x'} />
          </button>
          <span className="eyebrow">{t('Passo {a} de {b}', { a: i + 1, b: STEPS.length })}</span>
        </div>

        <div className="story-body funnel-body" key={step}>
          {coach[step] && (
            <div className="coach funnel-coach">
              <span className="coach-av">
                <Icon name="flame" size={18} />
              </span>
              <span className="coach-bubble">{coach[step]}</span>
            </div>
          )}

          {step === 'oath' && (
            <>
              <h1>{t('Antes de tudo, um juramento.')}</h1>
              <p className="lead">{t('Aqui é só entre você e você. Ninguém mais vai ler o que você escrever.')}</p>
              <blockquote className="oath-card">
                {t('Eu, {n}, juro ser sincero comigo mesmo. Não vou esconder nada, não vou aumentar nada e não vou mentir para mim. Se eu falhar, vou admitir e recomeçar.', { n: firstName || t('eu mesmo') })}
              </blockquote>
              <HoldButton done={d.oath} onDone={() => {
                set({ oath: true })
                setTimeout(() => setI(1), 700)
              }} />
            </>
          )}

          {step === 'photo' && (
            <>
              <h1>{t('Qual corpo você quer ter?')}</h1>
              <p className="lead">{t('Uma foto do shape que você quer. Pode ser de referência ou uma foto sua de quando estava em forma.')}</p>
              <div className={`funnel-photo ${photoUrl ? 'has' : ''}`}>{photoUrl ? <img src={photoUrl} alt="" /> : <Icon name="camera" size={34} />}</div>
              <PhotoButtons onFile={pick} disabled={busy} />
            </>
          )}

          {step === 'result' && (
            <>
              <h1>{t('Em uma frase: qual resultado você quer?')}</h1>
              <textarea rows={3} value={d.result} onChange={(e) => set({ result: e.target.value })} placeholder={t('Ex.: chegar a 80 kg com o abdômen aparecendo')} />
              <Chips list={['Perder 8 kg', 'Ver o abdômen aparecer', 'Ganhar massa muscular', 'Voltar a caber nas minhas roupas']} onPick={(x) => set({ result: x })} />
            </>
          )}

          {step === 'date' && (
            <>
              <h1>{t('Até quando você quer chegar lá?')}</h1>
              <div className="chip-grid funnel-days">
                {[60, 90, 120, 180].map((n) => {
                  const v = ymd(addDays(new Date(), n))
                  return (
                    <button key={n} type="button" className={`tap ${d.targetDate === v ? 'on' : ''}`} onClick={() => set({ targetDate: v })}>
                      {t('{n} dias', { n })}
                    </button>
                  )
                })}
              </div>
              <label className="funnel-date">
                {t('Ou escolha a data')}
                <input type="date" value={d.targetDate} onChange={(e) => set({ targetDate: e.target.value })} />
              </label>
              {left > 0 && <p className="funnel-big">{t('{n} dias a partir de hoje', { n: left })}</p>}
            </>
          )}

          {step === 'feeling' && (
            <>
              <h1>{t('Feche os olhos e imagine o dia em que você chegou lá. Como você se sente?')}</h1>
              <textarea rows={3} value={d.feeling} onChange={(e) => set({ feeling: e.target.value })} placeholder={t('Ex.: confiante para tirar a camisa na praia')} />
              <Chips list={['Orgulhoso de mim', 'Confiante para tirar a camisa', 'Com mais energia no dia a dia']} onPick={(x) => set({ feeling: x })} />
            </>
          )}

          {step === 'why' && (
            <>
              <h1>{t('Agora a verdade: por que você quer isso?')}</h1>
              <p className="lead">{t('Não vale resposta bonita. Vale a resposta real. Você jurou.')}</p>
              <textarea rows={3} value={d.why} onChange={(e) => set({ why: e.target.value })} placeholder={t('Ex.: quero ser exemplo para os meus filhos')} />
              <Chips list={['Quero cuidar da minha saúde', 'Quero me sentir bem no espelho', 'Quero provar que consigo']} onPick={(x) => set({ why: x })} />
            </>
          )}

          {step === 'past' && (
            <>
              <h1>{t('O que fez você desistir das outras vezes?')}</h1>
              <p className="lead">{t('Desabafa. Preguiça, trabalho, ansiedade, festa, vergonha. Escreva tudo. Só você lê.')}</p>
              <textarea rows={5} value={d.past} onChange={(e) => set({ past: e.target.value })} placeholder={t('Escreva o que está pesando. Só você vai ler.')} />
              <Chips list={['Comecei animado e parei em 2 semanas', 'O final de semana destruía tudo', 'Não via resultado e desanimava', 'A ansiedade me fazia comer', 'Nunca tentei de verdade']} onPick={(x) => set({ past: d.past.trim() ? `${d.past.trim()} ${x}` : x })} />
            </>
          )}

          {step === 'mood' && (
            <>
              <h1>{t('E agora, começando, como você está?')}</h1>
              <div className="big-opts">
                {MOODS.map((m) => (
                  <button key={m} type="button" className={`big-opt ${d.mood === m ? 'on' : ''}`} onClick={() => set({ mood: m })}>
                    <span className={`radio ${d.mood === m ? 'on' : ''}`} />
                    {t(MOOD_LABEL[m])}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'goal' && (
            <>
              <h1>{t('Uma meta para os próximos 30 dias')}</h1>
              <p className="lead">{t('Pequena e possível. Bater a primeira meta dá gás para as próximas.')}</p>
              <input value={d.goal} onChange={(e) => set({ goal: e.target.value })} placeholder={t('Ex.: fazer 10 barras seguidas')} />
              <Chips list={['Perder 3 kg', 'Correr 5 km sem parar', 'Treinar 20 dias no mês', 'Fazer 10 flexões seguidas']} onPick={(x) => set({ goal: x })} />
            </>
          )}

          {step === 'promise' && (
            <>
              <h1>{t('E uma promessa para amanhã')}</h1>
              <p className="lead">{t('Uma coisa pequena que você vai cumprir. Amanhã eu pergunto se você cumpriu.')}</p>
              <textarea rows={2} value={d.promise} onChange={(e) => set({ promise: e.target.value })} placeholder={t('Ex.: vou treinar amanhã mesmo cansado')} />
              <Chips list={['Vou treinar amanhã mesmo cansado', 'Vou beber 2 litros de água amanhã', 'Não vou comer doce amanhã', 'Vou dormir antes da meia-noite']} onPick={(x) => set({ promise: x })} />
            </>
          )}

          {step === 'review' && (
            <>
              <section className="pj-hero funnel-review" style={photoUrl ? { backgroundImage: `linear-gradient(180deg, rgba(5,15,40,.15), rgba(5,15,40,.9)), url(${photoUrl})` } : undefined}>
                <span className="pj-count">
                  <b>{left}</b> {t('dias')}
                </span>
                <p className="pj-result">{d.result}</p>
              </section>
              <ul className="funnel-sum card">
                <li>
                  <small>{t('Como vou me sentir')}</small>
                  <b>{d.feeling}</b>
                </li>
                <li>
                  <small>{t('Meu motivo')}</small>
                  <b>{d.why}</b>
                </li>
                <li>
                  <small>{t('Meta até {d}', { d: fmtDayMonth(parseYmd(goalDue)) })}</small>
                  <b>{d.goal}</b>
                </li>
                <li>
                  <small>{t('Promessa para amanhã')}</small>
                  <b>{d.promise}</b>
                </li>
              </ul>
              <p className="funnel-oath-mini">
                <Icon name="check" size={14} stroke={3} /> {t('Jurei ser sincero comigo mesmo.')}
              </p>
            </>
          )}
        </div>

        {step !== 'oath' && (
          <div className="story-foot">
            <button type="button" className={`cta ${step === 'review' ? 'funnel-go' : ''}`} onClick={next} disabled={!canNext[step]}>
              {step === 'review' ? t('Começar projetinho') : step === 'photo' && !d.photoId ? t('Pular por agora') : t('Próximo')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
