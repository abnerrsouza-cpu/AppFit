import { useMemo, useState } from 'react'
import { editPhoto } from '../components/PhotoEditor'
import { BeforeAfter } from '../components/BeforeAfter'
import { Icon } from '../components/Icon'
import { PhotoButtons } from '../components/PhotoButtons'
import { toast } from '../components/Toast'
import { usePhotoUrl } from '../usePhotos'
import { XP } from '../game'
import { Info, WithInfo } from '../components/Info'
import { Locked } from '../components/Locked'
import { compress, putPhoto } from '../photos'
import { WeekBars } from '../components/WeekBars'
import { t } from '../i18n'
import { type AppState, type WeeklyLog, addDays, currentWeight, fmtDayMonth, getProjeto, newId, parseYmd, setState, today, trainedOn, weekStartOf, weekStats, ymd } from '../store'

const label = (w: WeeklyLog, i: number) => `${t('Sem.')} ${i + 1} · ${fmtDayMonth(parseYmd(w.weekStart))}`

export function Evolution({ s, openCheckin, openWeekly = false }: { s: AppState; openCheckin: () => void; openWeekly?: boolean }) {
  const weeks = useMemo(() => Object.values(s.weekly).sort((a, b) => a.weekStart.localeCompare(b.weekStart)), [s.weekly])
  // foto do antes (início) + fotos dos check-ins semanais
  const withPhoto = [
    ...(s.startPhotoId ? [{ id: s.startPhotoId, label: t('Início') }] : []),
    ...weeks.map((w, i) => ({ w, i })).filter((x) => x.w.photoId).map((x) => ({ id: x.w.photoId!, label: label(x.w, x.i) })),
  ]
  const [aIdx, setA] = useState(0)
  const [bSel, setB] = useState<number | null>(null)
  const bIdx = bSel ?? Math.max(0, withPhoto.length - 1)
  const [form, setForm] = useState(openWeekly)
  const A = withPhoto[Math.min(aIdx, withPhoto.length - 1)]
  const B = withPhoto[Math.min(bIdx, withPhoto.length - 1)]
  const thisWeek = ymd(weekStartOf(new Date()))
  const hasThisWeek = !!s.weekly[thisWeek]
  const ws = weekStats(s)

  if (form) return <WeeklyForm s={s} onClose={() => setForm(false)} />

  return (
    <div className="screen">
      <header className="page-h">
        <span className="eyebrow">{t('Evolução')}</span>
        <h1 className="ttl">
          {t('Antes x Depois')}
          <Info text={t('Suas fotos semanais lado a lado. Arraste a linha do meio para comparar. Escolha as semanas logo abaixo.')} />
        </h1>
      </header>

      {withPhoto.length < 2 || !evoUnlocked(s).ok ? (
        <StartPair s={s} weekPhotoId={s.weekly[thisWeek]?.photoId} openWeekly={() => setForm(true)} />
      ) : (
      <section className="card block">
        <BeforeAfter
          beforeId={A?.id}
          afterId={B && B !== A ? B.id : undefined}
          beforeLabel={A?.label ?? ''}
          afterLabel={B?.label ?? ''}
        />
        {withPhoto.length >= 2 && (
          <div className="row2 pickers">
            <label>
              {t('Antes')}
              <select id="ev-a" value={aIdx} onChange={(e) => setA(Number(e.target.value))}>
                {withPhoto.map((x, k) => (
                  <option key={k} value={k}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('Depois')}
              <select id="ev-b" value={bIdx} onChange={(e) => setB(Number(e.target.value))}>
                {withPhoto.map((x, k) => (
                  <option key={k} value={k}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>
      )}

      {(withPhoto.length >= 2 || hasThisWeek) && (
      <button type="button" className={`card alert-card ${hasThisWeek ? 'is-ok' : ''}`} onClick={() => setForm(true)}>
        <Icon name={hasThisWeek ? 'check' : 'camera'} />
        <span>
          <b className="ttl">
            {hasThisWeek ? t('Check-in semanal feito') : t('Check-in semanal pendente')}
            <Info text={t('Uma vez por semana: foto, peso, cintura e uma avaliação da semana. É daqui que vêm o antes e depois e o gráfico de peso.')} />
          </b>
          <small>{hasThisWeek ? t('Toque para revisar foto, peso e notas.') : t('Foto, peso e a verdade sobre a semana.')}</small>
        </span>
        <Icon name="chevR" />
      </button>
      )}

      {weeks.length === 0 ? (
        <Locked
          icon="scale"
          title={t('Registre seu peso para liberar o Rumo à meta e o gráfico de peso')}
          text={t('Informe seu peso de hoje no check-in semanal.')}
          onClick={() => setForm(true)}
        />
      ) : (
        <>
          <Journey s={s} />
          <WeightChart s={s} weeks={weeks} />
        </>
      )}

      {ws.checkins === 0 ? (
        <Locked
          icon="list"
          title={t('Faça sua primeira prestação de contas para liberar os gráficos de dieta e cardio')}
          text={t('Toda noite você dá uma nota para a dieta e informa o cardio. Os gráficos da semana aparecem aqui.')}
          onClick={openCheckin}
        />
      ) : (
      <>

      <section className="card block">
        <div className="block-h">
          <h2 className="ttl">
            {t('Dieta na semana')}
            <Info text={t('A nota que você deu para a sua dieta em cada dia. A linha tracejada é a meta (8). Toque numa barra para ver o valor.')} />
          </h2>
          <span className="soft-chip">{t('meta: barra na linha')}</span>
        </div>
        <WeekBars days={ws.days} values={ws.logs.map((l) => (l ? l.dietScore : null))} max={10} unit="/10" goalLine={8} />
      </section>

      <section className="card block">
        <div className="block-h">
          <h2 className="ttl">
            {t('Cardio na semana')}
            <Info text={t('Minutos de cardio que você informou em cada dia. Ao lado, quanto já fez da sua meta semanal.')} />
          </h2>
          <span className="soft-chip">
            {t('{a} de {b} min', { a: ws.cardio, b: s.profile.cardioGoalMin })}
          </span>
        </div>
        <WeekBars days={ws.days} values={ws.logs.map((l) => (l ? l.cardioMin : null))} max={60} unit="min" />
      </section>
      </>
      )}
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
          <h2 className="ttl">
            {t('Peso')}
            <Info text={t('Seu peso semana a semana, desde o início. A linha verde tracejada é o seu peso meta.')} />
          </h2>
          <p>{t('Sua linha até a meta')}</p>
        </div>
        <b className="big-figure">
          {last.toFixed(1)}
          <small> kg</small>
        </b>
      </div>
      <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Peso por semana')}>
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
          {t('meta')}
        </text>
        <path d={area} className="area" />
        <path d={path} className="line" />
        {vals.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === vals.length - 1 ? 5 : 3} className={i === vals.length - 1 ? 'pt-end' : 'pt'}>
            <title>{i === 0 ? `${t('Início')}: ${v} kg` : `${t('Semana')} ${i}: ${v} kg`}</title>
          </circle>
        ))}
        <text x={x(0)} y={H - 6} textAnchor="start" className="axis">
          {t('início')}
        </text>
        <text x={x(vals.length - 1)} y={H - 6} textAnchor="end" className="axis">
          {t('sem.')} {vals.length - 1}
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

  const onFile = async (raw?: File) => {
    const file = raw && (await editPhoto(raw, 3 / 4))
    if (!file) return
    setBusy(true)
    try {
      const url = await compress(file)
      const id = newId()
      await putPhoto(id, url)
      setPreview(url)
      set('photoId', id)
      toast(t('Foto pronta'), t('Agora toque em Fechar a semana para salvar.'))
    } finally {
      setBusy(false)
    }
  }

  const Rate = ({ k, l }: { k: 'dietRate' | 'trainRate' | 'cardioRate'; l: string }) => (
    <div className="rate">
      <span>{l}</span>
      <div className="rate-btns">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={f[k] >= n ? 'on' : ''} onClick={() => set(k, n)} aria-label={`${l}: ${n}/5`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="sheet">
      <div className="sheet-h">
        <button type="button" className="round-btn" onClick={onClose} aria-label={t('Voltar')}>
          <Icon name="back" />
        </button>
        <span className="eyebrow">{t('Check-in semanal')}</span>
      </div>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          const first = !s.weekly[key]
          setState((st) => ({ ...st, weekly: { ...st.weekly, [key]: { ...f, submittedAt: new Date().toISOString() } } }))
          toast(first ? t('Semana fechada') : t('Check-in atualizado'), first ? t('+{n} pontos', { n: XP.weekly + (f.photoId ? XP.photo : 0) }) : undefined)
          onClose()
        }}
      >
        <h1 className="ttl">
          {t('Fechamento da semana')}
          <Info text={t('O check-in semanal. Preencha uma vez por semana, de preferência no mesmo dia e horário.')} />
        </h1>
        <p className="lead">{t('Foto sem filtro e sem ângulo esperto. Mesma luz, mesma pose, mesmo lugar toda semana.')}</p>

        <label className="card photo-drop">
          <input id="wk-photo" type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
          {preview ? (
            <img src={preview} alt={t('Foto da semana')} />
          ) : (
            <span>
              <Icon name="camera" size={30} />
              <b className="ttl">
                {busy ? t('Processando...') : f.photoId ? t('Foto enviada. Toque para trocar') : t('Tire ou envie uma foto de corpo inteiro')}
                <Info text={t('Foto de corpo inteiro para o antes e depois. Use sempre a mesma luz, pose e lugar para a comparação ser justa.')} />
              </b>
              <small>{t('A foto fica guardada só no seu aparelho.')}</small>
            </span>
          )}
        </label>
        <PhotoButtons onFile={onFile} disabled={busy} />

        <fieldset className="card field">
          <legend>
            <Icon name="scale" size={18} /> {t('Medidas')}
            <Info text={t('Peso e cintura de hoje. A cintura mostra perda de gordura mesmo quando a balança trava.')} />
          </legend>
          <div className="row2">
            <label>
              {t('Peso (kg)')}
              <input id="wk-weight" type="number" step={0.1} inputMode="decimal" value={f.weight} onChange={(e) => set('weight', Number(e.target.value))} />
            </label>
            <label>
              {t('Cintura (cm)')}
              <input id="wk-waist" type="number" step={0.5} inputMode="decimal" value={f.waist} onChange={(e) => set('waist', Number(e.target.value))} />
            </label>
          </div>
        </fieldset>

        <fieldset className="card field">
          <legend>
            <Icon name="target" size={18} /> {t('Dê uma nota de 1 a 5 para a sua semana')}
            <Info text={t('Dê de 1 a 5 para como foi sua dieta, seu treino e seu cardio na semana.')} />
          </legend>
          <Rate k="dietRate" l={t('Dieta')} />
          <Rate k="trainRate" l={t('Treino')} />
          <Rate k="cardioRate" l={t('Cardio')} />
        </fieldset>

        <fieldset className="card field">
          <legend>
            <Icon name="quote" size={18} /> {t('Responda com sinceridade')}
            <Info text={t('Três respostas curtas: o que deu certo, onde você se sabotou e um compromisso para a próxima semana.')} />
          </legend>
          <label>
            {t('O que deu certo nesta semana?')}
            <input id="wk-win" value={f.win} onChange={(e) => set('win', e.target.value)} />
          </label>
          <label>
            {t('Onde você se sabotou nesta semana?')}
            <input id="wk-fail" value={f.fail} onChange={(e) => set('fail', e.target.value)} />
          </label>
          <label>
            {t('O que você vai fazer diferente na próxima semana?')}
            <input id="wk-commit" value={f.commit} onChange={(e) => set('commit', e.target.value)} placeholder={t('Ex.: não pedir delivery no sábado')} />
          </label>
        </fieldset>

        <div className="sticky-submit">
          {f.photoId && !s.weekly[key]?.submittedAt && <small>{t('Sua foto só fica salva quando você fechar a semana.')}</small>}
          <WithInfo text={t('Salva o check-in da semana. A foto entra no antes e depois e o peso entra no gráfico.')}>
            <button type="submit" className="cta">
              {t('Fechar a semana')}
            </button>
          </WithInfo>
        </div>
      </form>
    </div>
  )
}

function Journey({ s }: { s: AppState }) {
  const p = s.profile
  const weight = currentWeight(s)
  const walked = Math.max(0, Math.min(1, (p.weightStart - weight) / (p.weightStart - p.weightGoal || 1)))
  const left = Math.max(0, +(weight - p.weightGoal).toFixed(1))
  return (
    <section className="card block">
      <div className="block-h">
        <h2 className="ttl">
          {t('Rumo à meta')}
          <Info text={t('A bolinha com sua inicial mostra quanto do caminho até o peso meta você já percorreu.')} />
        </h2>
        <span className="soft-chip">{left > 0 ? t('faltam {n} kg', { n: String(left).replace('.', ',') }) : t('meta batida')}</span>
      </div>
      <div className="journey">
        <div className="journey-track">
          <span className="journey-fill" style={{ width: `${walked * 100}%` }} />
          <span className="journey-me" style={{ left: `${walked * 100}%` }}>
            {(p.name || '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="journey-flag">
            <Icon name="target" size={18} />
          </span>
        </div>
        <div className="journey-ends">
          <small>{p.weightStart} kg</small>
          <small>{p.weightGoal} kg</small>
        </div>
      </div>
      {p.letter && (
        <p className="journey-letter">
          <Icon name="quote" size={18} /> {p.letter}
        </p>
      )}
    </section>
  )
}

/** O "depois" só libera depois do primeiro mês (28 dias) de projeto. */
export function evoUnlocked(s: AppState) {
  const start = parseYmd(s.profile.startDate || today())
  const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000))
  let trains = 0
  for (let i = 0; i <= Math.min(days, 60); i++) if (trainedOn(s, ymd(addDays(start, i))) >= 1) trains++
  return { ok: days >= 28, days, left: Math.max(0, 28 - days), trains }
}

/** Antes x Depois: a foto de agora já; o depois fica bloqueado até completar o primeiro mês. */
function StartPair({ s, weekPhotoId, openWeekly }: { s: AppState; weekPhotoId?: string; openWeekly: () => void }) {
  const before = usePhotoUrl(s.startPhotoId)
  const after = usePhotoUrl(weekPhotoId)
  const refUrl = usePhotoUrl(getProjeto(s).vision.photoId)
  const ev = evoUnlocked(s)
  const [busy, setBusy] = useState(false)
  const pick = async (raw?: File) => {
    const file = raw && (await editPhoto(raw, 3 / 4))
    if (!file) return
    setBusy(true)
    try {
      const url = await compress(file)
      const id = newId()
      await putPhoto(id, url)
      setState((st) => ({ ...st, startPhotoId: id }))
      toast(t('Foto de agora salva'), t('Daqui a 4 semanas, você vai agradecer por ter tirado.'))
    } finally {
      setBusy(false)
    }
  }
  const locked = !ev.ok
  return (
    <section className="card block pair">
      <div className="block-h">
        <h2 className="ttl">
          {t('Seu antes e depois')}
          <Info text={t('Antes: a sua foto de agora. Depois: libera quando você completar o primeiro mês de treino, com a foto do check-in semanal. É aqui que você vai ver que valeu a pena.')} />
        </h2>
        <small className="pair-count">{locked ? t('Dia {a} de 28', { a: Math.min(28, ev.days + 1) }) : t('Liberado')}</small>
      </div>
      {!s.startPhotoId && <p className="pair-hook">{t('Daqui a 4 semanas, você vai querer ver essa foto. Tire hoje.')}</p>}
      <div className="pair-grid">
        <div className={`pair-slot ${before ? 'ok' : 'now'}`}>
          <span className="pair-tag">{t('Agora')}</span>
          {before ? <img src={before} alt="" /> : <Icon name="camera" size={28} />}
          {before && (
            <span className="pair-saved">
              <Icon name="check" size={12} stroke={3} /> {t('Salva')}
            </span>
          )}
        </div>
        <div className={`pair-slot ${locked ? 'locked' : after ? 'ok' : ''}`}>
          <span className="pair-tag">{t('Depois')}</span>
          {locked ? (
            <>
              {refUrl && <img className="pair-ghost" src={refUrl} alt="" />}
              <span className="pair-lock">
                <Icon name="lock" size={26} />
                <b>{t('Bloqueada')}</b>
                <small>{ev.left === 1 ? t('Falta 1 dia') : t('Faltam {n} dias', { n: ev.left })}</small>
              </span>
            </>
          ) : after ? (
            <img src={after} alt="" />
          ) : (
            <Icon name="camera" size={28} />
          )}
        </div>
      </div>
      {locked && (
        <div className="pair-unlock">
          <b>
            <Icon name="lock" size={15} /> {t('Complete seu primeiro mês de treino para desbloquear sua evolução')}
          </b>
          <div className="pl-bar">
            <span style={{ width: `${(Math.min(28, ev.days + 1) / 28) * 100}%` }} />
          </div>
          <small className="muted">
            {t('Dia {a} de 28', { a: Math.min(28, ev.days + 1) })} · {ev.trains === 1 ? t('1 treino feito') : t('{n} treinos feitos', { n: ev.trains })}
          </small>
        </div>
      )}
      {!s.startPhotoId ? (
        <>
          <p className="lead">{t('Passo 1: tire agora uma foto de corpo inteiro, de frente, com roupa de treino. É o seu ponto de partida.')}</p>
          <PhotoButtons onFile={pick} disabled={busy} />
        </>
      ) : locked ? (
        <>
          <p className="lead">{t('Foto de agora guardada. Toda semana, faça o check-in com foto: é dele que sai o seu depois.')}</p>
          <button type="button" className="cta" onClick={openWeekly}>
            {t('Fazer check-in semanal')}
          </button>
        </>
      ) : !weekPhotoId ? (
        <>
          <p className="lead">{t('Primeiro mês completo. Faça o check-in semanal com uma foto nova: ela vira o seu depois.')}</p>
          <button type="button" className="cta" onClick={openWeekly}>
            {t('Fazer check-in semanal')}
          </button>
        </>
      ) : null}
    </section>
  )
}
