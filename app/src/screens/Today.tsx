import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Rings } from '../components/Rings'
import type { Tab } from '../components/BottomNav'
import { headline } from '../psych'
import { t, weekday, weekdayShort } from '../i18n'
import { type AppState, fmtDayMonth, setState, streak, today, weekDays, workoutFor, ymd } from '../store'

type Kind = 'wake' | 'meal' | 'train' | 'checkin'
interface Task {
  id: string
  time: string
  title: string
  detail?: string
  kind: Kind
  done: boolean
}

const EMOJI: Record<Kind, string> = { wake: '☀️', meal: '🍽️', train: '🏋️', checkin: '📝' }

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? t('Bom dia') : h < 18 ? t('Boa tarde') : t('Boa noite')
}

/** Progresso de hoje: vem da prestação de contas, ou das tarefas marcadas. */
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
  return { train: !wk ? 1 : checks.train ? 1 : 0, diet: p.meals.filter((m) => checks[m.id]).length / meals, cardio: 0, rest: !wk }
}

export function Today({ s, go, openCheckin, owes }: { s: AppState; go: (tab: Tab) => void; openCheckin: () => void; owes: boolean }) {
  const p = s.profile
  const now = new Date()
  const key = today()
  const hhmm = now.toTimeString().slice(0, 5)
  const checks = s.checks[key] || {}
  const log = s.daily[key]
  const wk = workoutFor(p, now)
  const [showFicha, setShowFicha] = useState(false)
  const st = streak(s)
  const prog = todayProgress(s)

  const tasks: Task[] = [
    { id: 'wake', time: p.wake, title: t('Acordar e beber água'), kind: 'wake' as Kind, done: !!checks.wake },
    ...p.meals.map((m) => ({ id: m.id, time: m.time, title: m.name, detail: m.items, kind: 'meal' as Kind, done: !!checks[m.id] })),
    ...(wk ? [{ id: 'train', time: p.trainTime, title: wk.title, detail: wk.items, kind: 'train' as Kind, done: !!checks.train }] : []),
    { id: 'checkin', time: p.checkinTime, title: t('Prestar contas do dia'), kind: 'checkin' as Kind, done: !!log },
  ].sort((a, b) => a.time.localeCompare(b.time))

  // "Agora": a tarefa pendente mais recente que já venceu; se nenhuma venceu, a próxima.
  const pending = tasks.filter((x) => !x.done)
  const due = pending.filter((x) => x.time <= hhmm)
  const current = due.length ? due[due.length - 1] : pending[0]
  const late = current && current.time <= hhmm
  const doneCount = tasks.filter((x) => x.done).length

  const toggle = (id: string) =>
    setState((x) => ({ ...x, checks: { ...x.checks, [key]: { ...(x.checks[key] || {}), [id]: !x.checks[key]?.[id] } } }))
  const act = (x: Task) => (x.kind === 'checkin' ? openCheckin() : toggle(x.id))

  return (
    <div className="screen">
      <header className="top-row">
        <div>
          <span className="date-chip">
            {weekday(now.getDay())}, {fmtDayMonth(now)}
          </span>
          <h1 className="hi">
            {greeting()}, {p.name || t('você')}
          </h1>
        </div>
        <button type="button" className="bell-btn" onClick={() => go('cobrancas')} aria-label={t('Mensagens do treinador')}>
          <Icon name="bell" size={22} />
          {owes && <i className="bnav-dot" />}
        </button>
      </header>

      {current ? (
        <section className={`now-card ${late ? 'is-late' : ''}`}>
          <div className="now-top">
            <span className="now-label">{late ? t('Agora') : `${t('Próximo')} · ${current.time}`}</span>
            {late && current.time !== hhmm && <span className="now-time">{t('desde {h}', { h: current.time })}</span>}
          </div>
          <div className="now-main">
            <span className="now-emoji">{EMOJI[current.kind]}</span>
            <div>
              <b>{current.title}</b>
              {current.kind === 'meal' && current.detail && <p>{current.detail}</p>}
              {current.kind === 'train' && <p>{t('{n} exercícios', { n: (current.detail || '').split('\n').length })}</p>}
              {current.kind === 'checkin' && <p>{t('Leva menos de 1 minuto.')}</p>}
            </div>
          </div>
          {current.kind === 'train' && showFicha && <pre className="ficha now-ficha">{current.detail}</pre>}
          <div className="now-actions">
            <button type="button" className="now-btn" onClick={() => act(current)}>
              {current.kind === 'checkin' ? (
                t('Prestar contas')
              ) : (
                <>
                  <Icon name="check" size={18} stroke={3} /> {t('Feito')}
                </>
              )}
            </button>
            {current.kind === 'train' && (
              <button type="button" className="now-btn ghost" onClick={() => setShowFicha(!showFicha)}>
                {showFicha ? t('Fechar ficha') : t('Ver ficha')}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="now-card is-done">
          <span className="now-emoji">🏆</span>
          <b>{t('Dia cumprido.')}</b>
          <p>{t('Tudo marcado e prestação de contas enviada. Amanhã de novo.')}</p>
        </section>
      )}

      <button type="button" className="coach" onClick={() => go('cobrancas')}>
        <span className="coach-av">
          <Icon name="flame" size={20} />
        </span>
        <span className="coach-bubble">{headline(s)}</span>
      </button>

      <section className="card day-list">
        <div className="day-list-h">
          <Rings
            size={64}
            values={[
              { v: prog.train, color: 'var(--ring-1)' },
              { v: prog.diet, color: 'var(--ring-2)' },
              { v: prog.cardio, color: 'var(--ring-3)' },
            ]}
          />
          <div>
            <h2>{t('Seu dia')}</h2>
            <small>
              {t('{a} de {b} feitos', { a: doneCount, b: tasks.length })}
            </small>
          </div>
        </div>
        <ul>
          {tasks.map((x) => (
            <li key={x.id} className={`trow ${x.done ? 'is-done' : ''} ${x === current ? 'is-current' : ''}`}>
              <span className="trow-time">{x.time}</span>
              <span className="trow-emoji">{EMOJI[x.kind]}</span>
              <span className="trow-title">{x.title}</span>
              <button
                type="button"
                className={`tick ${x.done ? 'on' : ''}`}
                onClick={() => act(x)}
                disabled={x.kind === 'checkin' && x.done}
                aria-label={x.done ? t('Desmarcar {x}', { x: x.title }) : t('Marcar {x} como feito', { x: x.title })}
              >
                {x.done && <Icon name="check" size={16} stroke={3} />}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="streak-card">
        <div className="streak-main">
          <span className="streak-flame">
            <Icon name="flame" size={40} stroke={2.2} />
          </span>
          <div>
            <b className="streak-n">{st}</b>
            <span>{t('dias sem falhar')}</span>
          </div>
        </div>
        <div className="flames">
          {weekDays().map((d) => {
            const k = ymd(d)
            const l = s.daily[k]
            const cls = k > key ? 'fut' : l ? (l.dietScore >= 8 && l.trained !== 'nao' ? 'lit' : 'half') : k === key ? 'now' : 'off'
            return (
              <span key={k} className={`fl fl-${cls}`}>
                <i>{cls === 'off' ? <Icon name="x" size={14} stroke={3} /> : <Icon name="flame" size={18} />}</i>
                <small>{weekdayShort(d.getDay())}</small>
              </span>
            )
          })}
        </div>
      </section>
    </div>
  )
}
