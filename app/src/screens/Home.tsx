import { BeforeAfter } from '../components/BeforeAfter'
import { Icon } from '../components/Icon'
import { Rings } from '../components/Rings'
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
  weekDays,
  workoutFor,
  ymd,
} from '../store'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

/** Progresso de hoje: vem da prestação de contas, ou das tarefas marcadas em "Seu dia". */
export function todayProgress(s: AppState) {
  const p = s.profile
  const key = today()
  const log = s.daily[key]
  const checks = s.checks[key] || {}
  const wk = workoutFor(p, new Date())
  const dailyCardio = Math.max(10, Math.round(p.cardioGoalMin / 5))
  const meals = p.meals.length || 1
  if (log) {
    return {
      train: log.trained === 'sim' || log.trained === 'descanso' ? 1 : log.trained === 'parcial' ? 0.5 : 0,
      diet: Object.values(log.mealsOk).filter(Boolean).length / meals,
      cardio: log.cardioMin / dailyCardio,
      rest: !wk,
    }
  }
  return {
    train: !wk ? 1 : checks.train ? 1 : 0,
    diet: p.meals.filter((m) => checks[m.id]).length / meals,
    cardio: 0,
    rest: !wk,
  }
}

export function Home({ s, go, openCheckin, owes }: { s: AppState; go: (t: Tab) => void; openCheckin: () => void; owes: boolean }) {
  const p = s.profile
  const now = new Date()
  const c = cycleInfo(p)
  const st = streak(s)
  const done = !!s.daily[today()]
  const wk = workoutFor(p, now)
  const prog = todayProgress(s)
  const weight = currentWeight(s)
  const total = Math.abs(p.weightStart - p.weightGoal) || 1
  const walked = Math.max(0, Math.min(1, (p.weightStart - weight) / (p.weightStart - p.weightGoal || 1)))
  const left = Math.max(0, +(weight - p.weightGoal).toFixed(1))
  const photos = Object.values(s.weekly)
    .filter((x) => x.photoId)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const first = photos[0]
  const last = photos[photos.length - 1]
  const days = weekDays()

  const status = (v: number) => (v >= 1 ? 'Feito' : v > 0 ? 'Em andamento' : done ? 'Não fez' : 'Falta')

  return (
    <div className="screen">
      <header className="top-row">
        <div>
          <span className="date-chip">
            {WEEKDAYS[now.getDay()]}, {fmtDayMonth(now)}
          </span>
          <h1 className="hi">
            {greeting()}, {p.name || 'você'}
          </h1>
        </div>
        <button type="button" className="bell-btn" onClick={() => go('cobrancas')} aria-label="Cobranças do treinador">
          <Icon name="bell" size={22} />
          {owes && <i className="bnav-dot" />}
        </button>
      </header>

      <button type="button" className="coach" onClick={() => go('cobrancas')}>
        <span className="coach-av">
          <Icon name="flame" size={22} />
        </span>
        <span className="coach-bubble">{headline(s)}</span>
      </button>

      <section className="card today">
        <div className="today-rings">
          <Rings
            size={148}
            values={[
              { v: prog.train, color: 'var(--ring-1)' },
              { v: prog.diet, color: 'var(--ring-2)' },
              { v: prog.cardio, color: 'var(--ring-3)' },
            ]}
          />
        </div>
        <ul className="today-legend">
          <li>
            <i style={{ background: 'var(--ring-1)' }}>
              <Icon name="dumbbell" size={16} />
            </i>
            <span>
              <b>{prog.rest ? 'Descanso' : wk?.title}</b>
              <small>{prog.rest ? 'Dia livre de treino' : status(prog.train)}</small>
            </span>
          </li>
          <li>
            <i style={{ background: 'var(--ring-2)' }}>
              <Icon name="food" size={16} />
            </i>
            <span>
              <b>Dieta</b>
              <small>{status(prog.diet)}</small>
            </span>
          </li>
          <li>
            <i style={{ background: 'var(--ring-3)' }}>
              <Icon name="run" size={16} />
            </i>
            <span>
              <b>Cardio</b>
              <small>{status(prog.cardio)}</small>
            </span>
          </li>
        </ul>
        {done ? (
          <div className="today-done">
            <Icon name="check" size={18} stroke={3} /> Prestação de contas enviada
          </div>
        ) : (
          <button type="button" className="cta" onClick={openCheckin}>
            Prestar contas do dia
          </button>
        )}
      </section>

      <section className="streak-card">
        <div className="streak-main">
          <span className="streak-flame">
            <Icon name="flame" size={44} stroke={2.2} />
          </span>
          <div>
            <b className="streak-n">{st}</b>
            <span>dias sem falhar</span>
          </div>
        </div>
        <div className="flames">
          {days.map((d) => {
            const k = ymd(d)
            const l = s.daily[k]
            const fut = k > today()
            const cls = fut ? 'fut' : l ? (l.dietScore >= 8 && l.trained !== 'nao' ? 'lit' : 'half') : k === today() ? 'now' : 'off'
            return (
              <span key={k} className={`fl fl-${cls}`}>
                <i>{cls === 'off' ? <Icon name="x" size={14} stroke={3} /> : <Icon name="flame" size={18} />}</i>
                <small>{WEEKDAYS_SHORT[d.getDay()]}</small>
              </span>
            )
          })}
        </div>
        <div className="cycle">
          <div className="cycle-bar">
            <span style={{ width: `${c.pct * 100}%` }} />
          </div>
          <small>
            Dia {c.day} de {p.cycleDays}
          </small>
        </div>
      </section>

      <section className="card block">
        <div className="block-h">
          <h2>Rumo à meta</h2>
          <span className="soft-chip">{left > 0 ? `faltam ${left.toString().replace('.', ',')} kg` : 'meta batida'}</span>
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
        {total > 0 && walked > 0 && <p className="hint">Você já andou {Math.round(walked * 100)}% do caminho.</p>}
      </section>

      <section className="card block">
        <div className="block-h">
          <h2>Antes x Depois</h2>
          <button type="button" className="link" onClick={() => go('evolucao')}>
            Ver tudo <Icon name="arrow" size={16} />
          </button>
        </div>
        <BeforeAfter
          compact
          beforeId={first?.photoId}
          afterId={last && last !== first ? last.photoId : undefined}
          beforeLabel="Antes"
          afterLabel="Agora"
        />
      </section>

      <section className="card block letter">
        <Icon name="quote" size={26} />
        <p>{p.letter || 'Escreva sua carta de compromisso no Menu. Ela vai ser usada para te cobrar.'}</p>
        <small>Sua promessa no dia 1</small>
      </section>
    </div>
  )
}
