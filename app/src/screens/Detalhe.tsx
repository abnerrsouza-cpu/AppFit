// Página de detalhe de cada quadro da tela Hoje: treinos, cardio, dieta e peso.
import { Icon } from '../components/Icon'
import { Info } from '../components/Info'
import { t, weekdayShort } from '../i18n'
import { type AppState, addDays, currentWeight, fmtDayMonth, parseYmd, setState, today, trainedOn, weekDays, weekStartOf, weekStats, workoutFor, ymd } from '../store'

export type DetailKind = 'treinos' | 'cardio' | 'dieta' | 'peso'

const TITLE: Record<DetailKind, string> = { treinos: 'Treinos', cardio: 'Cardio', dieta: 'Dieta', peso: 'Peso' }
const ICON: Record<DetailKind, string> = { treinos: 'dumbbell', cardio: 'run', dieta: 'food', peso: 'scale' }

function Bars({ items, max, goal, fmt }: { items: { label: string; v: number; now?: boolean; hit?: boolean }[]; max: number; goal?: number; fmt?: (v: number) => string }) {
  const top = Math.max(max, goal ?? 0, 1)
  return (
    <div className="dt-bars">
      {goal ? <span className="dt-goal" style={{ bottom: `calc(22px + ${goal / top} * (100% - 40px))` }} /> : null}
      {items.map((x, i) => (
        <div key={i} className={`dt-col ${x.now ? 'now' : ''}`}>
          <span className="dt-v">{x.v ? (fmt ? fmt(x.v) : x.v) : ''}</span>
          <span className="dt-bar">
            <span className={x.hit ? 'hit' : ''} style={{ height: `${(x.v / top) * 100}%` }} />
          </span>
          <small>{x.label}</small>
        </div>
      ))}
    </div>
  )
}

export function Detalhe({ s, kind, onBack, go }: { s: AppState; kind: DetailKind; onBack: () => void; go: (to: 'plano' | 'evolucao' | 'checkin' | 'dieta' | 'semanal') => void }) {
  const p = s.profile
  const key = today()
  const c = s.checks[key] || {}
  const days = weekDays()
  const ws = weekStats(s)
  const flip = (id: string) => setState((x) => ({ ...x, checks: { ...x.checks, [key]: { ...(x.checks[key] || {}), [id]: !x.checks[key]?.[id] } } }))
  const dailyCardio = Math.max(10, Math.round(p.cardioGoalMin / 5))
  // últimas 4 semanas (da mais antiga para a atual)
  const weeks = [3, 2, 1, 0].map((n) => {
    const ref = addDays(weekStartOf(new Date()), -7 * n)
    return { ref, st: weekStats(s, ref), label: n === 0 ? t('Esta') : fmtDayMonth(ref) }
  })

  return (
    <div className="screen dt">
      <div className="sheet-h">
        <button type="button" className="round-btn" onClick={onBack} aria-label={t('Voltar')}>
          <Icon name="back" />
        </button>
        <span className="eyebrow">{t('Hoje')}</span>
      </div>
      <h1 className="ttl dt-title">
        <span className={`dt-ic ${kind}`}>
          <Icon name={ICON[kind]} size={22} />
        </span>
        {t(TITLE[kind])}
      </h1>

      {kind === 'treinos' && (
        <>
          <section className="card dt-hero">
            <b className="dt-big">
              {ws.trained}
              {ws.planned > 0 && <small>/{ws.planned}</small>}
            </b>
            <span>{t('treinos nesta semana')}</span>
            <div className="dt-week">
              {days.map((d) => {
                const k = ymd(d)
                const done = trainedOn(s, k) >= 1
                const plan = !!workoutFor(p, d)
                const st = done ? 'on' : k > key ? 'fut' : plan && k < key ? 'miss' : plan ? 'todo' : 'rest'
                return (
                  <span key={k} className={`dw dw-${st} ${k === key ? 'dw-now' : ''}`}>
                    <i>{done ? <Icon name="check" size={14} stroke={3} /> : st === 'miss' ? <Icon name="x" size={13} stroke={3} /> : st === 'rest' ? <Icon name="bed" size={12} /> : null}</i>
                    <small>{weekdayShort(d.getDay())}</small>
                  </span>
                )
              })}
            </div>
          </section>
          {workoutFor(p, new Date()) && (
            <button type="button" className={`pl-big-check ${trainedOn(s, key) >= 1 ? 'on' : ''}`} onClick={() => flip('train')}>
              <Icon name="check" size={22} stroke={3} /> {trainedOn(s, key) >= 1 ? t('Treino feito hoje') : t('Treinei hoje')}
            </button>
          )}
          <section className="card block">
            <h2 className="ttl">{t('Últimas 4 semanas')}</h2>
            <Bars items={weeks.map((w) => ({ label: w.label, v: w.st.trained, now: w.label === t('Esta'), hit: w.st.planned > 0 && w.st.trained >= w.st.planned }))} max={Math.max(...weeks.map((w) => w.st.planned))} />
          </section>
          <button type="button" className="link pl-edit" onClick={() => go('plano')}>
            <Icon name="list" size={16} /> {t('Ver meu treino da semana')}
          </button>
        </>
      )}

      {kind === 'cardio' && (
        <>
          <section className="card dt-hero">
            <b className="dt-big">
              {ws.cardio}
              <small> / {p.cardioGoalMin} min</small>
            </b>
            <span>{t('de cardio nesta semana')}</span>
            <div className="pl-bar">
              <span style={{ width: `${Math.min(100, (ws.cardio / Math.max(1, p.cardioGoalMin)) * 100)}%` }} />
            </div>
            <small className="muted">
              {ws.cardio >= p.cardioGoalMin ? t('Meta da semana batida.') : t('Faltam {n} min. Cerca de {d} min por dia.', { n: p.cardioGoalMin - ws.cardio, d: dailyCardio })}
            </small>
          </section>
          {p.cardioGoalMin > 0 && (
            <button type="button" className={`pl-big-check ${c.cardio ? 'on' : ''}`} onClick={() => flip('cardio')}>
              <Icon name="check" size={22} stroke={3} /> {c.cardio ? t('Cardio feito hoje') : t('Fiz o cardio de hoje ({n} min)', { n: dailyCardio })}
            </button>
          )}
          <section className="card block">
            <h2 className="ttl">{t('Minutos por dia')}</h2>
            <Bars
              items={days.map((d) => {
                const k = ymd(d)
                const v = s.daily[k]?.cardioMin || (s.checks[k]?.cardio ? dailyCardio : 0)
                return { label: weekdayShort(d.getDay()), v, now: k === key, hit: v >= dailyCardio }
              })}
              max={dailyCardio}
              goal={dailyCardio}
            />
          </section>
          <p className="dt-tip">
            <Icon name="flame" size={16} /> {t('Esteira, bike, escada ou caminhada rápida valem. O que importa é fazer e marcar.')}
          </p>
        </>
      )}

      {kind === 'dieta' && (
        <>
          <section className="card dt-hero">
            <b className={`dt-big ${ws.diet >= 8 ? 'good' : ws.diet >= 6 ? 'warn' : ws.checkins ? 'bad' : ''}`}>
              {ws.checkins ? ws.diet.toFixed(1) : '—'}
              <small>/10</small>
            </b>
            <span>{t('nota média da dieta nesta semana')}</span>
            <small className="muted">
              {!ws.checkins ? t('A nota vem da prestação de contas da noite. Preste contas hoje para começar.') : ws.diet >= 8 ? t('Dieta firme. É ela que mais mexe no seu peso.') : ws.diet >= 6 ? t('Dá para apertar. Uma refeição melhor por dia já muda a semana.') : t('A dieta está segurando o seu resultado. Foque nela esta semana.')}
            </small>
          </section>
          <section className="card block">
            <div className="block-h">
              <h2 className="ttl">{t('Nota por dia')}</h2>
              <Info text={t('Cada barra é a nota que você deu à dieta na prestação de contas. Verde é 8 ou mais.')} />
            </div>
            <Bars
              items={days.map((d) => {
                const k = ymd(d)
                const l = s.daily[k]
                const v = l ? l.dietScore : s.checks[k]?.diet ? 9 : 0
                return { label: weekdayShort(d.getDay()), v, now: k === key, hit: v >= 8 }
              })}
              max={10}
              goal={8}
            />
          </section>
          <button type="button" className="cta" onClick={() => go('checkin')}>
            {s.daily[key] ? t('Rever prestação de contas de hoje') : t('Prestar contas e dar nota à dieta')}
          </button>
          <button type="button" className="link pl-edit" onClick={() => go('plano')}>
            <Icon name="list" size={16} /> {t('Ver meu plano alimentar')}
          </button>
        </>
      )}

      {kind === 'peso' && <Peso s={s} go={go} />}
    </div>
  )
}

function Peso({ s, go }: { s: AppState; go: (to: 'semanal') => void }) {
  const p = s.profile
  const cur = currentWeight(s)
  const list = Object.values(s.weekly)
    .filter((w) => w.weight)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const pts = [{ d: p.startDate, w: p.weightStart }, ...list.map((w) => ({ d: w.weekStart, w: w.weight }))]
  const lose = p.weightGoal < p.weightStart
  const moved = Math.round((lose ? p.weightStart - cur : cur - p.weightStart) * 10) / 10
  const left = Math.round(Math.abs(cur - p.weightGoal) * 10) / 10
  const way = Math.abs(p.weightStart - p.weightGoal) || 1
  const pct = Math.max(0, Math.min(1, moved / way))
  const ws = pts.map((x) => x.w).concat(p.weightGoal)
  const lo = Math.min(...ws) - 1
  const hi = Math.max(...ws) + 1
  const W = 300
  const H = 120
  const x = (i: number) => (pts.length < 2 ? W / 2 : (i / (pts.length - 1)) * (W - 20) + 10)
  const y = (w: number) => H - ((w - lo) / (hi - lo)) * (H - 16) - 8
  const thisWeek = ymd(weekStartOf(new Date()))
  return (
    <>
      <section className="card dt-hero">
        <div className="dt-trio">
          <span>
            <small>{t('Início')}</small>
            <b>{p.weightStart} kg</b>
          </span>
          <span className="cur">
            <small>{t('Agora')}</small>
            <b>{cur.toFixed(1)} kg</b>
          </span>
          <span>
            <small>{t('Meta')}</small>
            <b>{p.weightGoal} kg</b>
          </span>
        </div>
        <div className="pl-bar">
          <span style={{ width: `${pct * 100}%` }} />
        </div>
        <small className="muted">
          {moved > 0 ? t(lose ? '{a} kg a menos desde o início. Faltam {b} kg.' : '{a} kg a mais desde o início. Faltam {b} kg.', { a: String(moved).replace('.', ','), b: String(left).replace('.', ',') }) : t('Faltam {b} kg. A primeira pesagem semanal mostra se você está no caminho.', { b: String(left).replace('.', ',') })}
        </small>
      </section>
      <section className="card block">
        <h2 className="ttl">{t('Seu peso semana a semana')}</h2>
        {pts.length < 2 ? (
          <p className="muted">{t('Ainda não há pesagens. Faça o check-in semanal com o seu peso para ver a linha aqui.')}</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="dt-line" aria-hidden="true">
            <line x1="0" x2={W} y1={y(p.weightGoal)} y2={y(p.weightGoal)} className="goal" />
            <polyline points={pts.map((pt, i) => `${x(i)},${y(pt.w)}`).join(' ')} />
            {pts.map((pt, i) => (
              <circle key={i} cx={x(i)} cy={y(pt.w)} r={i === pts.length - 1 ? 5 : 3.5} className={i === pts.length - 1 ? 'last' : ''} />
            ))}
          </svg>
        )}
        <ul className="dt-list">
          {pts
            .slice()
            .reverse()
            .map((pt, i) => (
              <li key={i}>
                <span>{i === pts.length - 1 ? t('Início') : fmtDayMonth(parseYmd(pt.d))}</span>
                <b>{pt.w.toFixed(1)} kg</b>
              </li>
            ))}
        </ul>
      </section>
      {!s.weekly[thisWeek] && (
        <button type="button" className="cta" onClick={() => go('semanal')}>
          {t('Registrar o peso desta semana')}
        </button>
      )}
    </>
  )
}
