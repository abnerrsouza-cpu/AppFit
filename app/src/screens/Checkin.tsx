import { useState } from 'react'
import { Icon } from '../components/Icon'
import { feedback, nudge } from '../psych'
import { type AppState, type DailyLog, type Trained, setState, today, workoutFor } from '../store'

// Escalas de carinha: viram nota 0-10 por baixo, mas a pessoa só toca.
const FACES = [
  { e: '😫', l: 'Péssimo', v: 2 },
  { e: '😕', l: 'Fraco', v: 4 },
  { e: '😐', l: 'Ok', v: 6 },
  { e: '🙂', l: 'Bom', v: 8 },
  { e: '🔥', l: 'Perfeito', v: 10 },
]
const nearest = (v: number) => FACES.reduce((a, f) => (Math.abs(f.v - v) < Math.abs(a.v - v) ? f : a)).v

export function Checkin({ s, onClose }: { s: AppState; onClose: () => void }) {
  const p = s.profile
  const key = today()
  const wk = workoutFor(p, new Date())
  const prev = s.daily[key]
  const checks = s.checks[key] || {}
  const [f, setF] = useState<DailyLog>(
    prev ?? {
      date: key,
      trained: wk ? (checks.train ? 'sim' : 'nao') : 'descanso',
      cardioMin: 0,
      cardioType: 'Esteira',
      dietScore: 8,
      mealsOk: Object.fromEntries(p.meals.map((m) => [m.id, checks[m.id] ?? true])),
      ate: '',
      focus: 8,
      water: 2,
      sleepH: 7,
      dayNote: '',
      submittedAt: '',
    },
  )
  const [step, setStep] = useState(0)
  const [honest, setHonest] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof feedback> | null>(null)
  const set = <K extends keyof DailyLog>(k: K, v: DailyLog[K]) => setF((x) => ({ ...x, [k]: v }))
  const missed = p.meals.filter((m) => !f.mealsOk[m.id])
  const STEPS = 6

  const submit = () => {
    const log = { ...f, submittedAt: new Date().toISOString() }
    setState((st) => ({ ...st, daily: { ...st.daily, [key]: log } }))
    setResult(feedback({ ...s, daily: { ...s.daily, [key]: log } }, log))
  }

  if (result) {
    return (
      <div className="sheet">
        <div className={`result result-${result.level}`}>
          <span className="result-emoji">{result.level === 'good' ? '🏆' : result.level === 'warn' ? '⚠️' : '😤'}</span>
          <h1>{result.title}</h1>
          <p>{result.body}</p>
          <button type="button" className="cta" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    )
  }

  const trainOpts: { v: Trained; e: string; l: string }[] = wk
    ? [
        { v: 'sim', e: '💪', l: 'Fiz tudo' },
        { v: 'parcial', e: '😮‍💨', l: 'Fiz uma parte' },
        { v: 'nao', e: '🛋️', l: 'Não fiz' },
      ]
    : [
        { v: 'descanso', e: '😴', l: 'Descansei' },
        { v: 'sim', e: '💪', l: 'Treinei mesmo assim' },
      ]

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : submit())

  return (
    <div className="sheet story">
      <div className="story-bars" aria-label={`Pergunta ${step + 1} de ${STEPS}`}>
        {Array.from({ length: STEPS }, (_, i) => (
          <i key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      <div className="sheet-h">
        <button type="button" className="round-btn" onClick={step ? () => setStep(step - 1) : onClose} aria-label={step ? 'Voltar' : 'Fechar'}>
          <Icon name={step ? 'back' : 'x'} />
        </button>
        <span className="eyebrow">Prestação de contas</span>
      </div>

      <div className="story-body">
        {step === 0 && (
          <>
            <h1>{wk ? `E o treino de hoje?` : 'Hoje era descanso'}</h1>
            {wk && <p className="lead">{wk.title}</p>}
            <div className="big-opts">
              {trainOpts.map((o) => (
                <button key={o.v} type="button" className={`big-opt ${f.trained === o.v ? 'on' : ''} ${o.v === 'nao' ? 'neg' : ''}`} onClick={() => set('trained', o.v)}>
                  <span className="emo">{o.e}</span>
                  <b>{o.l}</b>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Fez cardio?</h1>
            <div className="chip-grid">
              {[0, 15, 20, 30, 45, 60].map((m) => (
                <button key={m} type="button" className={`tap ${f.cardioMin === m ? 'on' : ''}`} onClick={() => set('cardioMin', m)}>
                  <b>{m === 0 ? 'Não' : m === 60 ? '60+' : m}</b>
                  {m > 0 && <small>min</small>}
                </button>
              ))}
            </div>
            {f.cardioMin > 0 && (
              <div className="type-row">
                {[
                  ['Esteira', '🏃'],
                  ['Bike', '🚴'],
                  ['Escada', '🪜'],
                  ['Rua', '🌳'],
                  ['Natação', '🏊'],
                ].map(([t, e]) => (
                  <button key={t} type="button" className={`type ${f.cardioType === t ? 'on' : ''}`} onClick={() => set('cardioType', t)}>
                    <span>{e}</span>
                    <small>{t}</small>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h1>Seguiu as refeições?</h1>
            <p className="lead">Toque nas que você furou.</p>
            <div className="plates">
              {p.meals.map((m) => {
                const ok = f.mealsOk[m.id]
                return (
                  <button key={m.id} type="button" className={`plate ${ok ? 'ok' : 'no'}`} onClick={() => set('mealsOk', { ...f.mealsOk, [m.id]: !ok })}>
                    <span className="plate-ic">{ok ? <Icon name="check" size={22} stroke={3} /> : <Icon name="x" size={22} stroke={3} />}</span>
                    <b>{m.name}</b>
                    <small>{ok ? 'Segui' : 'Furei'}</small>
                  </button>
                )
              })}
            </div>
            {missed.length > 0 && (
              <label className="soft-input">
                O que você comeu no lugar?
                <textarea id="ci-ate" rows={2} value={f.ate} placeholder="Sem vergonha. Só você vê." onChange={(e) => set('ate', e.target.value)} />
              </label>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h1>No geral, como foi a dieta?</h1>
            <Faces value={nearest(f.dietScore)} onChange={(v) => set('dietScore', v)} />
          </>
        )}

        {step === 4 && (
          <>
            <h1>E o corpo?</h1>
            <div className="mini-q">
              <span>Quanta água você bebeu?</span>
              <div className="glasses">
                {Array.from({ length: 8 }, (_, i) => (
                  <button key={i} type="button" className={`glass ${f.water >= (i + 1) * 0.5 ? 'on' : ''}`} onClick={() => set('water', f.water === (i + 1) * 0.5 ? i * 0.5 : (i + 1) * 0.5)} aria-label={`${(i + 1) * 0.5} litros`}>
                    <Icon name="droplet" size={20} />
                  </button>
                ))}
              </div>
              <small className="muted">{f.water.toString().replace('.', ',')} litros</small>
            </div>
            <div className="mini-q">
              <span>Quanto dormiu?</span>
              <div className="seg-big">
                {[
                  [5, 'Pouco'],
                  [6, '6h'],
                  [7, '7h'],
                  [8, '8h+'],
                ].map(([v, l]) => (
                  <button key={v} type="button" className={f.sleepH === v ? 'on' : ''} onClick={() => set('sleepH', v as number)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="mini-q">
              <span>Seu foco no objetivo hoje</span>
              <Faces value={nearest(f.focus)} onChange={(v) => set('focus', v)} small />
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h1>Última coisa.</h1>
            <p className="lead">{nudge(s, 'checkin')}</p>
            <button type="button" className={`pledge ${honest ? 'on' : ''}`} onClick={() => setHonest(!honest)} aria-pressed={honest}>
              <span className="pledge-ic">{honest ? <Icon name="check" size={30} stroke={3} /> : <Icon name="lock" size={28} />}</span>
              <b>Fui 100% honesto comigo</b>
              <small>Toque para confirmar</small>
            </button>
          </>
        )}
      </div>

      <div className="story-foot">
        <button type="button" className="cta" onClick={next} disabled={step === STEPS - 1 && !honest}>
          {step === STEPS - 1 ? 'Enviar' : 'Próximo'}
        </button>
      </div>
    </div>
  )
}

function Faces({ value, onChange, small = false }: { value: number; onChange: (v: number) => void; small?: boolean }) {
  return (
    <div className={`faces ${small ? 'sm' : ''}`}>
      {FACES.map((f) => (
        <button key={f.v} type="button" className={`face ${value === f.v ? 'on' : ''}`} onClick={() => onChange(f.v)}>
          <span>{f.e}</span>
          <small>{f.l}</small>
        </button>
      ))}
    </div>
  )
}
