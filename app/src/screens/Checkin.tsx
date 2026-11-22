import { useState } from 'react'
import { Icon } from '../components/Icon'
import { feedback, nudge } from '../psych'
import { type AppState, type DailyLog, type Trained, setState, today, workoutFor } from '../store'

export function Checkin({ s, onClose }: { s: AppState; onClose: () => void }) {
  const p = s.profile
  const key = today()
  const wk = workoutFor(p, new Date())
  const prev = s.daily[key]
  const [f, setF] = useState<DailyLog>(
    prev ?? {
      date: key,
      trained: wk ? 'sim' : 'descanso',
      cardioMin: 0,
      cardioType: 'Esteira',
      dietScore: 8,
      mealsOk: Object.fromEntries(p.meals.map((m) => [m.id, true])),
      ate: '',
      focus: 7,
      water: 2.5,
      sleepH: 7,
      dayNote: '',
      submittedAt: '',
    },
  )
  const [honest, setHonest] = useState(!!prev)
  const [result, setResult] = useState<ReturnType<typeof feedback> | null>(null)
  const set = <K extends keyof DailyLog>(k: K, v: DailyLog[K]) => setF((x) => ({ ...x, [k]: v }))
  const missed = p.meals.filter((m) => !f.mealsOk[m.id])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!honest) return
    const log = { ...f, submittedAt: new Date().toISOString() }
    setState((st) => ({ ...st, daily: { ...st.daily, [key]: log } }))
    setResult(feedback({ ...s, daily: { ...s.daily, [key]: log } }, log))
  }

  if (result) {
    return (
      <div className="sheet">
        <div className={`result result-${result.level}`}>
          <span className="result-icon">
            <Icon name={result.level === 'good' ? 'check' : result.level === 'warn' ? 'alert' : 'x'} size={40} stroke={2.6} />
          </span>
          <h1>{result.title}</h1>
          <p>{result.body}</p>
          <button type="button" className="cta" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    )
  }

  const trainOpts: { v: Trained; l: string }[] = wk
    ? [
        { v: 'sim', l: 'Fiz tudo' },
        { v: 'parcial', l: 'Fiz parte' },
        { v: 'nao', l: 'Não fiz' },
      ]
    : [
        { v: 'descanso', l: 'Descansei' },
        { v: 'sim', l: 'Treinei mesmo assim' },
      ]

  return (
    <div className="sheet">
      <div className="sheet-h">
        <button type="button" className="round-btn" onClick={onClose} aria-label="Fechar">
          <Icon name="x" />
        </button>
        <span className="eyebrow">Prestação de contas</span>
      </div>
      <form className="form" onSubmit={submit}>
        <h1>Como foi seu dia?</h1>
        <p className="lead">{nudge(s, 'checkin')}</p>

        <fieldset className="card field">
          <legend>
            <Icon name="dumbbell" size={18} /> Treino{wk ? `: ${wk.title}` : ''}
          </legend>
          <div className="chips">
            {trainOpts.map((o) => (
              <button key={o.v} type="button" className={`chip ${f.trained === o.v ? 'on' : ''} ${o.v === 'nao' ? 'chip-bad' : ''}`} onClick={() => set('trained', o.v)}>
                {o.l}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="card field">
          <legend>
            <Icon name="run" size={18} /> Cardio
          </legend>
          <div className="row2">
            <label>
              Minutos
              <input id="ci-cardio" type="number" inputMode="numeric" min={0} max={300} value={f.cardioMin} onChange={(e) => set('cardioMin', Number(e.target.value))} />
            </label>
            <label>
              Tipo
              <select id="ci-cardio-type" value={f.cardioType} onChange={(e) => set('cardioType', e.target.value)}>
                {['Esteira', 'Bike', 'Escada', 'Corrida na rua', 'Caminhada', 'Natação', 'Outro'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <small className="muted">Relógio conectado preenche isso sozinho (em breve, via Strava).</small>
        </fieldset>

        <fieldset className="card field">
          <legend>
            <Icon name="food" size={18} /> Refeições do plano
          </legend>
          <div className="meal-list">
            {p.meals.map((m) => (
              <div key={m.id} className="meal-row">
                <span>
                  <b>{m.name}</b>
                  <small>{m.time}</small>
                </span>
                <div className="seg">
                  <button type="button" className={f.mealsOk[m.id] ? 'on is-ok' : ''} onClick={() => set('mealsOk', { ...f.mealsOk, [m.id]: true })}>
                    Segui
                  </button>
                  <button type="button" className={!f.mealsOk[m.id] ? 'on is-bad' : ''} onClick={() => set('mealsOk', { ...f.mealsOk, [m.id]: false })}>
                    Furei
                  </button>
                </div>
              </div>
            ))}
          </div>
          <label>
            {missed.length ? `O que você comeu no lugar (${missed.map((m) => m.name.toLowerCase()).join(', ')})?` : 'Comeu algo fora do plano?'}
            <textarea id="ci-ate" rows={3} value={f.ate} placeholder="Escreva tudo. Inclusive o que você queria esconder." onChange={(e) => set('ate', e.target.value)} />
          </label>
          <label className="slider">
            <span>
              Nota da dieta hoje <b>{f.dietScore}/10</b>
            </span>
            <input id="ci-diet" type="range" min={0} max={10} value={f.dietScore} onChange={(e) => set('dietScore', Number(e.target.value))} />
          </label>
        </fieldset>

        <fieldset className="card field">
          <legend>
            <Icon name="brain" size={18} /> Corpo e mente
          </legend>
          <label className="slider">
            <span>
              Foco no objetivo <b>{f.focus}/10</b>
            </span>
            <input id="ci-focus" type="range" min={0} max={10} value={f.focus} onChange={(e) => set('focus', Number(e.target.value))} />
          </label>
          <div className="row2">
            <label>
              Água (litros)
              <input id="ci-water" type="number" step={0.5} min={0} max={10} inputMode="decimal" value={f.water} onChange={(e) => set('water', Number(e.target.value))} />
            </label>
            <label>
              Sono (horas)
              <input id="ci-sleep" type="number" step={0.5} min={0} max={14} inputMode="decimal" value={f.sleepH} onChange={(e) => set('sleepH', Number(e.target.value))} />
            </label>
          </div>
          <label>
            Como foi o dia, em uma frase
            <input id="ci-note" type="text" value={f.dayNote} onChange={(e) => set('dayNote', e.target.value)} placeholder="Ex.: dia corrido, mas não negociei o treino" />
          </label>
        </fieldset>

        <label className={`card honest ${honest ? 'on' : ''}`}>
          <input id="ci-honest" type="checkbox" checked={honest} onChange={(e) => setHonest(e.target.checked)} />
          <span className="tick">{honest && <Icon name="check" size={16} stroke={3} />}</span>
          <span>
            <b>Declaro que fui 100% honesto comigo.</b>
            <small>Você pagou R$ {p.price.toFixed(2).replace('.', ',')} e só você usa. Esconder informação aqui é enganar a si mesmo.</small>
          </span>
        </label>

        <button type="submit" className="cta" disabled={!honest}>
          Enviar prestação de contas
        </button>
      </form>
    </div>
  )
}
