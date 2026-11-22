import { useState } from 'react'
import { Icon } from '../components/Icon'
import { feedback } from '../psych'
import {
  type AppState,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  addDays,
  fmtDayMonth,
  setState,
  today,
  weekDays,
  workoutFor,
  ymd,
} from '../store'

interface Item {
  id: string
  time: string
  title: string
  detail?: string
  kind: 'wake' | 'meal' | 'train' | 'checkin' | 'sleep'
}

export function Day({ s, openCheckin }: { s: AppState; openCheckin: () => void }) {
  const [ref, setRef] = useState(new Date())
  const [sel, setSel] = useState(ymd(new Date()))
  const days = weekDays(ref)
  const selDate = new Date(sel + 'T12:00')
  const p = s.profile
  const log = s.daily[sel]
  const isToday = sel === today()
  const isFuture = sel > today()
  const checks = s.checks[sel] || {}
  const wk = workoutFor(p, selDate)
  const [openTrain, setOpenTrain] = useState(false)

  const items: Item[] = [
    { id: 'wake', time: p.wake, title: 'Acordar', kind: 'wake' as const },
    ...p.meals.map((m) => ({ id: m.id, time: m.time, title: m.name, detail: m.items, kind: 'meal' as const })),
    ...(wk ? [{ id: 'train', time: p.trainTime, title: wk.title, detail: wk.items, kind: 'train' as const }] : []),
    { id: 'checkin', time: p.checkinTime, title: 'Prestação de contas', kind: 'checkin' as const },
    { id: 'sleep', time: p.sleep, title: 'Dormir', kind: 'sleep' as const },
  ].sort((a, b) => a.time.localeCompare(b.time))

  const toggle = (id: string) =>
    setState((st) => ({ ...st, checks: { ...st.checks, [sel]: { ...(st.checks[sel] || {}), [id]: !st.checks[sel]?.[id] } } }))

  const doneCount = items.filter((i) => (i.kind === 'checkin' ? !!log : checks[i.id])).length
  const fb = log ? feedback(s, log) : null
  const icon = { wake: 'sun', meal: 'food', train: 'dumbbell', checkin: 'list', sleep: 'moon' }

  return (
    <div className="screen">
      <header className="page-h">
        <span className="eyebrow">Rotina</span>
        <h1>
          {WEEKDAYS[selDate.getDay()]}, {fmtDayMonth(selDate)}
        </h1>
      </header>

      <div className="card week-strip">
        <button type="button" className="round-btn" onClick={() => setRef(addDays(ref, -7))} aria-label="Semana anterior">
          <Icon name="chevL" />
        </button>
        <div className="week-days">
          {days.map((d) => {
            const k = ymd(d)
            const l = s.daily[k]
            const status = k > today() ? '' : l ? (l.dietScore >= 8 && l.trained !== 'nao' ? 'good' : l.dietScore >= 6 ? 'mid' : 'bad') : k === today() ? '' : 'bad'
            return (
              <button key={k} type="button" className={`wd ${k === sel ? 'is-sel' : ''} ${k === today() ? 'is-today' : ''}`} onClick={() => setSel(k)}>
                <small>{WEEKDAYS_SHORT[d.getDay()]}</small>
                <b>{d.getDate()}</b>
                <i className={`wd-dot ${status}`} />
              </button>
            )
          })}
        </div>
        <button type="button" className="round-btn" onClick={() => setRef(addDays(ref, 7))} aria-label="Próxima semana">
          <Icon name="chevR" />
        </button>
      </div>

      {!isFuture && (
        <div className="card progress-card">
          <div>
            <b>
              {doneCount} de {items.length}
            </b>
            <small> tarefas cumpridas</small>
          </div>
          <div className="meter">
            <span style={{ width: `${(doneCount / items.length) * 100}%` }} />
          </div>
        </div>
      )}

      <ol className="timeline">
        {items.map((it) => {
          const checked = it.kind === 'checkin' ? !!log : !!checks[it.id]
          return (
            <li key={it.id} className={`tl ${checked ? 'is-done' : ''} tl-${it.kind}`}>
              <span className="tl-time">{it.time}</span>
              <div className="card tl-card">
                <span className="tl-icon">
                  <Icon name={icon[it.kind]} size={20} />
                </span>
                <div className="tl-body">
                  <b>{it.title}</b>
                  {it.kind === 'meal' && it.detail && <small>{it.detail}</small>}
                  {it.kind === 'train' && (
                    <>
                      <button type="button" className="link" onClick={() => setOpenTrain(!openTrain)}>
                        {openTrain ? 'Esconder ficha' : 'Ver ficha de treino'}
                      </button>
                      {openTrain && <pre className="ficha">{it.detail || 'Cadastre a ficha no Menu.'}</pre>}
                    </>
                  )}
                  {it.kind === 'checkin' && log && <small>Enviada. {fb?.title}</small>}
                </div>
                {it.kind === 'checkin' ? (
                  !log && !isFuture ? (
                    <button type="button" className="pill-btn sm" onClick={openCheckin} disabled={!isToday}>
                      {isToday ? 'Fazer' : 'Perdeu'}
                    </button>
                  ) : (
                    <span className={`tick ${log ? 'on' : ''}`}>{log && <Icon name="check" size={16} stroke={3} />}</span>
                  )
                ) : (
                  <button
                    type="button"
                    className={`tick ${checked ? 'on' : ''}`}
                    onClick={() => toggle(it.id)}
                    disabled={isFuture}
                    aria-label={checked ? `Desmarcar ${it.title}` : `Marcar ${it.title} como feito`}
                  >
                    {checked && <Icon name="check" size={16} stroke={3} />}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {log && (
        <section className={`card block fb fb-${fb!.level}`}>
          <h2>Resumo do dia</h2>
          <div className="kv">
            <span>Treino</span>
            <b>{{ sim: 'Feito', parcial: 'Parcial', nao: 'Não fez', descanso: 'Descanso' }[log.trained]}</b>
            <span>Cardio</span>
            <b>
              {log.cardioMin} min {log.cardioMin ? `· ${log.cardioType}` : ''}
            </b>
            <span>Dieta</span>
            <b>{log.dietScore}/10</b>
            <span>Foco</span>
            <b>{log.focus}/10</b>
            <span>Água · Sono</span>
            <b>
              {log.water} L · {log.sleepH} h
            </b>
          </div>
          {log.ate && <p className="muted">"{log.ate}"</p>}
        </section>
      )}

      {p.icalUrl ? (
        <p className="foot-note">
          <Icon name="calendar" size={16} /> Agenda do Google conectada. Os compromissos entram aqui quando o servidor estiver ligado.
        </p>
      ) : null}
    </div>
  )
}
