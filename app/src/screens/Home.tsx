import { BeforeAfter } from '../components/BeforeAfter'
import { Icon } from '../components/Icon'
import { WeekBars } from '../components/WeekBars'
import type { Tab } from '../components/BottomNav'
import { headline } from '../psych'
import {
  type AppState,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  currentWeight,
  cycleInfo,
  fmtDayMonth,
  streak,
  today,
  weekStats,
  workoutFor,
  ymd,
} from '../store'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export function Home({ s, go, openCheckin }: { s: AppState; go: (t: Tab) => void; openCheckin: () => void }) {
  const p = s.profile
  const now = new Date()
  const c = cycleInfo(p)
  const st = streak(s)
  const w = weekStats(s)
  const done = !!s.daily[today()]
  const wk = workoutFor(p, now)
  const weight = currentWeight(s)
  const lost = +(p.weightStart - weight).toFixed(1)
  const photos = Object.values(s.weekly)
    .filter((x) => x.photoId)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const first = photos[0]
  const last = photos[photos.length - 1]

  return (
    <div className="screen">
      <header className="hello">
        <h1>
          {greeting()}, {p.name || 'você'}
        </h1>
        <p>{headline(s)}</p>
      </header>

      <button type="button" className="card day-card" onClick={() => go('dia')}>
        <span className="day-icon">
          <Icon name="sun" size={30} />
        </span>
        <span className="day-txt">
          <b>
            Seu dia · {WEEKDAYS[now.getDay()]}, {fmtDayMonth(now)}
          </b>
          <small>{wk ? `Treino: ${wk.title}` : 'Dia de descanso. Dieta continua.'}</small>
        </span>
        <span className="pill-btn">
          Abrir <Icon name="arrow" size={18} />
        </span>
      </button>

      {!done && (
        <button type="button" className="card alert-card" onClick={openCheckin}>
          <Icon name="alert" />
          <span>
            <b>Prestação de contas pendente</b>
            <small>Até meia-noite, ou a sequência de {st} dias zera.</small>
          </span>
          <Icon name="chevR" />
        </button>
      )}

      <section className="hero-card">
        <div className="hero-top">
          <span>Sequência</span>
          <span className="hero-icon">
            <Icon name="flame" />
          </span>
        </div>
        <div className="hero-num">
          {st}
          <small>{st === 1 ? 'dia' : 'dias'}</small>
        </div>
        <p>prestando contas sem falhar</p>
        <div className="hero-cycle">
          <div className="hero-bar">
            <span style={{ width: `${c.pct * 100}%` }} />
          </div>
          <span>
            Dia {c.day} de {p.cycleDays} · faltam {c.left}
          </span>
        </div>
      </section>

      <div className="grid2">
        <div className="card tile">
          <span className="tile-h">
            Treinos <Icon name="dumbbell" size={18} />
          </span>
          <b className="tile-n">
            {w.trained}
            <small>/{w.planned}</small>
          </b>
          <span className="tile-s">nesta semana</span>
        </div>
        <div className="card tile">
          <span className="tile-h">
            Cardio <Icon name="run" size={18} />
          </span>
          <b className="tile-n">
            {w.cardio}
            <small> min</small>
          </b>
          <div className="meter">
            <span style={{ width: `${Math.min(100, (w.cardio / p.cardioGoalMin) * 100)}%` }} />
          </div>
          <span className="tile-s">meta {p.cardioGoalMin} min</span>
        </div>
        <div className="card tile">
          <span className="tile-h">
            Dieta <Icon name="food" size={18} />
          </span>
          <b className={`tile-n ${w.diet >= 8 ? 'ok' : w.diet >= 6 ? 'warn' : w.checkins ? 'bad' : ''}`}>
            {w.checkins ? w.diet.toFixed(1) : '—'}
            <small>/10</small>
          </b>
          <span className="tile-s">média da semana</span>
        </div>
        <div className="card tile">
          <span className="tile-h">
            Peso <Icon name="scale" size={18} />
          </span>
          <b className="tile-n">
            {weight.toFixed(1)}
            <small> kg</small>
          </b>
          <span className={`tile-s ${lost > 0 ? 'ok' : ''}`}>
            {lost > 0 ? `−${lost} kg desde o início` : `meta ${p.weightGoal} kg`}
          </span>
        </div>
      </div>

      <section className="card block">
        <div className="block-h">
          <div>
            <h2>Termômetro da semana</h2>
            <p>Prestação de contas por dia</p>
          </div>
          <b className="big-figure">
            {w.checkins}
            <small>/7</small>
          </b>
        </div>
        <div className="thermo">
          {w.days.map((d, i) => {
            const l = w.logs[i]
            const future = ymd(d) > today()
            const isToday = ymd(d) === today()
            const state = future ? 'future' : !l ? (isToday ? 'pending' : 'miss') : l.dietScore >= 8 && l.trained !== 'nao' ? 'good' : l.dietScore >= 6 ? 'mid' : 'bad'
            return (
              <div key={i} className={`thermo-d is-${state}`}>
                <span className="thermo-dot">
                  {state === 'good' && <Icon name="check" size={16} stroke={3} />}
                  {state === 'mid' && <Icon name="alert" size={15} stroke={2.4} />}
                  {(state === 'bad' || state === 'miss') && <Icon name="x" size={15} stroke={3} />}
                </span>
                <b>{WEEKDAYS_SHORT[d.getDay()]}</b>
              </div>
            )
          })}
        </div>
        <div className="thermo-legend">
          <span>
            <i style={{ background: 'var(--good)' }} /> Cumpriu
          </span>
          <span>
            <i style={{ background: 'var(--warn)' }} /> Parcial
          </span>
          <span>
            <i style={{ background: 'var(--bad)' }} /> Furou ou sumiu
          </span>
        </div>
      </section>

      <section className="card block">
        <div className="block-h">
          <div>
            <h2>Dieta</h2>
            <p>Nota que você se deu por dia (0 a 10)</p>
          </div>
        </div>
        <WeekBars days={w.days} values={w.logs.map((l) => (l ? l.dietScore : null))} max={10} unit="/10" goalLine={8} />
      </section>

      <section className="card block">
        <div className="block-h">
          <div>
            <h2>Cardio</h2>
            <p>Minutos por dia</p>
          </div>
          <b className="big-figure">
            {w.cardio}
            <small> min</small>
          </b>
        </div>
        <WeekBars days={w.days} values={w.logs.map((l) => (l ? l.cardioMin : null))} max={60} unit="min" />
      </section>

      <section className="card block">
        <div className="block-h">
          <div>
            <h2>Foco</h2>
            <p>Média da semana</p>
          </div>
          <b className="big-figure">
            {w.checkins ? w.focus.toFixed(1) : '—'}
            <small>/10</small>
          </b>
        </div>
        <div className="meter meter-lg">
          <span style={{ width: `${(w.focus / 10) * 100}%` }} />
        </div>
      </section>

      <section className="card block">
        <div className="block-h">
          <div>
            <h2>Antes x Depois</h2>
            <p>Arraste a linha para comparar</p>
          </div>
          <button type="button" className="link" onClick={() => go('evolucao')}>
            Ver tudo <Icon name="arrow" size={16} />
          </button>
        </div>
        <BeforeAfter
          compact
          beforeId={first?.photoId}
          afterId={last && last !== first ? last.photoId : undefined}
          beforeLabel={first ? fmtDayMonth(new Date(first.weekStart + 'T12:00')) : ''}
          afterLabel={last ? fmtDayMonth(new Date(last.weekStart + 'T12:00')) : ''}
        />
      </section>

      <section className="card block letter">
        <Icon name="quote" size={26} />
        <p>{p.letter || 'Escreva sua carta de compromisso no Menu. Ela vai ser usada para te cobrar.'}</p>
        <small>Sua carta de compromisso · dia 1</small>
      </section>
    </div>
  )
}
