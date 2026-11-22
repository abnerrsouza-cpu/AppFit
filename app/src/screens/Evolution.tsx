import { useMemo, useState } from 'react'
import { BeforeAfter } from '../components/BeforeAfter'
import { Icon } from '../components/Icon'
import { compress, putPhoto } from '../photos'
import { type AppState, type WeeklyLog, bmi, fmtDayMonth, newId, parseYmd, setState, weekStartOf, ymd } from '../store'

const label = (w: WeeklyLog, i: number) => `Sem. ${i + 1} · ${fmtDayMonth(parseYmd(w.weekStart))}`

export function Evolution({ s }: { s: AppState }) {
  const weeks = useMemo(() => Object.values(s.weekly).sort((a, b) => a.weekStart.localeCompare(b.weekStart)), [s.weekly])
  const withPhoto = weeks.map((w, i) => ({ w, i })).filter((x) => x.w.photoId)
  const [aIdx, setA] = useState(0)
  const [bIdx, setB] = useState(Math.max(0, withPhoto.length - 1))
  const [form, setForm] = useState(false)
  const A = withPhoto[Math.min(aIdx, withPhoto.length - 1)]
  const B = withPhoto[Math.min(bIdx, withPhoto.length - 1)]
  const thisWeek = ymd(weekStartOf(new Date()))
  const hasThisWeek = !!s.weekly[thisWeek]

  if (form) return <WeeklyForm s={s} onClose={() => setForm(false)} />

  return (
    <div className="screen">
      <header className="page-h">
        <span className="eyebrow">Evolução</span>
        <h1>Antes x Depois</h1>
      </header>

      <section className="card block">
        <BeforeAfter
          beforeId={A?.w.photoId}
          afterId={B && B !== A ? B.w.photoId : undefined}
          beforeLabel={A ? label(A.w, A.i) : ''}
          afterLabel={B ? label(B.w, B.i) : ''}
        />
        {withPhoto.length >= 2 && (
          <div className="row2 pickers">
            <label>
              Antes
              <select id="ev-a" value={aIdx} onChange={(e) => setA(Number(e.target.value))}>
                {withPhoto.map((x, k) => (
                  <option key={k} value={k}>
                    {label(x.w, x.i)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Depois
              <select id="ev-b" value={bIdx} onChange={(e) => setB(Number(e.target.value))}>
                {withPhoto.map((x, k) => (
                  <option key={k} value={k}>
                    {label(x.w, x.i)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      <button type="button" className={`card alert-card ${hasThisWeek ? 'is-ok' : ''}`} onClick={() => setForm(true)}>
        <Icon name={hasThisWeek ? 'check' : 'camera'} />
        <span>
          <b>{hasThisWeek ? 'Check-in semanal feito' : 'Check-in semanal pendente'}</b>
          <small>{hasThisWeek ? 'Toque para revisar foto, peso e notas.' : 'Foto, peso e a verdade sobre a semana.'}</small>
        </span>
        <Icon name="chevR" />
      </button>

      <WeightChart s={s} weeks={weeks} />

      <section className="card block">
        <h2>Semanas</h2>
        <ul className="week-list">
          {weeks
            .slice()
            .reverse()
            .map((w) => {
              const i = weeks.indexOf(w)
              const prev = weeks[i - 1]
              const d = prev ? +(w.weight - prev.weight).toFixed(1) : 0
              return (
                <li key={w.weekStart}>
                  <span>
                    <b>Semana {i + 1}</b>
                    <small>{fmtDayMonth(parseYmd(w.weekStart))}</small>
                  </span>
                  <span className="wl-mid">
                    {w.weight.toFixed(1)} kg
                    {prev && <small className={d < 0 ? 'ok' : d > 0 ? 'bad' : ''}>{d > 0 ? `+${d}` : d}</small>}
                  </span>
                  <span className="wl-photo">{w.photoId ? <Icon name="camera" size={16} /> : <small>sem foto</small>}</span>
                </li>
              )
            })}
        </ul>
      </section>
    </div>
  )
}

function WeightChart({ s, weeks }: { s: AppState; weeks: WeeklyLog[] }) {
  const p = s.profile
  const vals = [p.weightStart, ...weeks.map((w) => w.weight)]
  if (weeks.length === 0) return null
  const W = 320
  const H = 130
  const padL = 34
  const padR = 12
  const padT = 14
  const padB = 22
  const lo = Math.floor(Math.min(...vals, p.weightGoal) - 1)
  const hi = Math.ceil(Math.max(...vals) + 1)
  const x = (i: number) => padL + (i / Math.max(1, vals.length - 1)) * (W - padL - padR)
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB)
  const path = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${path} L${x(vals.length - 1)},${H - padB} L${x(0)},${H - padB} Z`
  const ticks = [lo, Math.round((lo + hi) / 2), hi]
  const last = vals[vals.length - 1]
  return (
    <section className="card block">
      <div className="block-h">
        <div>
          <h2>Peso</h2>
          <p>
            Início {p.weightStart} kg · meta {p.weightGoal} kg · IMC {bmi(last, p.height).toFixed(1)}
          </p>
        </div>
        <b className="big-figure">
          {last.toFixed(1)}
          <small> kg</small>
        </b>
      </div>
      <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Peso por semana">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid" />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" className="axis">
              {t}
            </text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={y(p.weightGoal)} y2={y(p.weightGoal)} className="goal" />
        <text x={W - padR} y={y(p.weightGoal) - 5} textAnchor="end" className="axis">
          meta
        </text>
        <path d={area} className="area" />
        <path d={path} className="line" />
        {vals.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === vals.length - 1 ? 5 : 3} className={i === vals.length - 1 ? 'pt-end' : 'pt'}>
            <title>{i === 0 ? `Início: ${v} kg` : `Semana ${i}: ${v} kg`}</title>
          </circle>
        ))}
        <text x={x(0)} y={H - 6} textAnchor="start" className="axis">
          início
        </text>
        <text x={x(vals.length - 1)} y={H - 6} textAnchor="end" className="axis">
          sem. {vals.length - 1}
        </text>
      </svg>
    </section>
  )
}

function WeeklyForm({ s, onClose }: { s: AppState; onClose: () => void }) {
  const key = ymd(weekStartOf(new Date()))
  const prev = s.weekly[key]
  const last = Object.values(s.weekly).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0]
  const [f, setF] = useState<WeeklyLog>(
    prev ?? {
      weekStart: key,
      weight: last?.weight ?? s.profile.weightStart,
      waist: last?.waist ?? 90,
      dietRate: 3,
      trainRate: 3,
      cardioRate: 3,
      win: '',
      fail: '',
      commit: '',
      submittedAt: '',
    },
  )
  const [preview, setPreview] = useState<string>()
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof WeeklyLog>(k: K, v: WeeklyLog[K]) => setF((x) => ({ ...x, [k]: v }))

  const onFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const url = await compress(file)
      const id = newId()
      await putPhoto(id, url)
      setPreview(url)
      set('photoId', id)
    } finally {
      setBusy(false)
    }
  }

  const Rate = ({ k, l }: { k: 'dietRate' | 'trainRate' | 'cardioRate'; l: string }) => (
    <div className="rate">
      <span>{l}</span>
      <div className="rate-btns">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={f[k] >= n ? 'on' : ''} onClick={() => set(k, n)} aria-label={`${l}: ${n} de 5`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="sheet">
      <div className="sheet-h">
        <button type="button" className="round-btn" onClick={onClose} aria-label="Voltar">
          <Icon name="back" />
        </button>
        <span className="eyebrow">Check-in semanal</span>
      </div>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          setState((st) => ({ ...st, weekly: { ...st.weekly, [key]: { ...f, submittedAt: new Date().toISOString() } } }))
          onClose()
        }}
      >
        <h1>Fechamento da semana</h1>
        <p className="lead">Foto sem filtro e sem ângulo esperto. Mesma luz, mesma pose, mesmo lugar toda semana.</p>

        <label className="card photo-drop">
          <input id="wk-photo" type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} />
          {preview ? (
            <img src={preview} alt="Foto da semana" />
          ) : (
            <span>
              <Icon name="camera" size={30} />
              <b>{busy ? 'Processando...' : f.photoId ? 'Foto enviada. Toque para trocar' : 'Tirar ou enviar foto'}</b>
              <small>A foto fica guardada só no seu aparelho.</small>
            </span>
          )}
        </label>

        <fieldset className="card field">
          <legend>
            <Icon name="scale" size={18} /> Medidas
          </legend>
          <div className="row2">
            <label>
              Peso (kg)
              <input id="wk-weight" type="number" step={0.1} inputMode="decimal" value={f.weight} onChange={(e) => set('weight', Number(e.target.value))} />
            </label>
            <label>
              Cintura (cm)
              <input id="wk-waist" type="number" step={0.5} inputMode="decimal" value={f.waist} onChange={(e) => set('waist', Number(e.target.value))} />
            </label>
          </div>
        </fieldset>

        <fieldset className="card field">
          <legend>
            <Icon name="target" size={18} /> Nota da semana
          </legend>
          <Rate k="dietRate" l="Dieta" />
          <Rate k="trainRate" l="Treino" />
          <Rate k="cardioRate" l="Cardio" />
        </fieldset>

        <fieldset className="card field">
          <legend>
            <Icon name="quote" size={18} /> Sem enrolação
          </legend>
          <label>
            Sua maior vitória da semana
            <input id="wk-win" value={f.win} onChange={(e) => set('win', e.target.value)} />
          </label>
          <label>
            Onde você se sabotou
            <input id="wk-fail" value={f.fail} onChange={(e) => set('fail', e.target.value)} />
          </label>
          <label>
            Um compromisso para a próxima semana
            <input id="wk-commit" value={f.commit} onChange={(e) => set('commit', e.target.value)} placeholder="Ex.: sábado sem delivery" />
          </label>
        </fieldset>

        <button type="submit" className="cta">
          Fechar a semana
        </button>
      </form>
    </div>
  )
}
