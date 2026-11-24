// Treino e dieta: o plano de cada dia da semana, detalhado, para usar na academia e na cozinha.
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Info } from '../components/Info'
import { toast } from '../components/Toast'
import { t, weekday } from '../i18n'
import { type AppState, planMeals, setState, today } from '../store'

type View = 'treino' | 'dieta'

/** "Supino reto — 4x10 (60s)" → nome + séries/reps + detalhe */
function parseExercise(line: string) {
  const raw = line.replace(/^[-•*\d.)\s]+/, '').trim()
  const m = raw.match(/(\d+)\s*[x×X]\s*(\d+(?:\s*[-a/]\s*\d+)?|falha|max)/i)
  if (!m) return { name: raw, sets: '', extra: '' }
  const name = raw.slice(0, m.index).replace(/[—–\-:|,]+\s*$/, '').trim() || raw
  const extra = raw.slice((m.index ?? 0) + m[0].length).replace(/^[\s—–\-:|,]+/, '').replace(/^\((.*)\)$/, '$1').trim()
  return { name, sets: `${m[1]}x${m[2].replace(/\s+/g, '')}`, extra }
}
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

/** Cronômetro de descanso entre séries. */
function RestTimer() {
  const [left, setLeft] = useState(0)
  const end = useRef(0)
  useEffect(() => {
    if (!left) return
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((end.current - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) {
        navigator.vibrate?.([200, 100, 200])
        toast(t('Descanso acabou'), t('Bora para a próxima série.'))
      }
    }, 250)
    return () => clearInterval(id)
  }, [left > 0]) // eslint-disable-line react-hooks/exhaustive-deps
  const start = (sec: number) => {
    end.current = Date.now() + sec * 1000
    setLeft(sec)
  }
  return (
    <div className={`rest ${left ? 'on' : ''}`}>
      <span className="rest-l">
        <Icon name="watch" size={18} /> {left ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : t('Descanso')}
      </span>
      {left ? (
        <button type="button" className="rest-b stop" onClick={() => setLeft(0)}>
          {t('Parar')}
        </button>
      ) : (
        [60, 90, 120].map((s) => (
          <button key={s} type="button" className="rest-b" onClick={() => start(s)}>
            {s < 120 ? `${s}s` : '2min'}
          </button>
        ))
      )}
    </div>
  )
}

export function Plano({ s, goMenu }: { s: AppState; goMenu: (sec: string) => void }) {
  const p = s.profile
  const now = new Date()
  const [day, setDay] = useState(now.getDay())
  const [view, setView] = useState<View>(() => (now.getHours() < 11 || !p.workouts.some((w) => w.weekday === now.getDay() && w.items.trim()) ? 'dieta' : 'treino'))
  const isToday = day === now.getDay()
  const key = today()
  const checks = s.checks[key] || {}
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const toggle = (id: string, extra?: Record<string, boolean>) =>
    setState((x) => ({ ...x, checks: { ...x.checks, [key]: { ...(x.checks[key] || {}), [id]: !x.checks[key]?.[id], ...(extra || {}) } } }))

  const wk = p.workouts.find((w) => w.weekday === day && w.items.trim())
  const exercises = wk ? lines(wk.items).map(parseExercise) : []
  const exDone = exercises.filter((_, i) => checks[`ex:${i}`]).length
  const meals = planMeals(p).sort((a, b) => a.time.localeCompare(b.time))
  const mealsDone = meals.filter((m) => checks[m.id]).length
  const nextMeal = meals.find((m) => !checks[m.id] && m.time >= hhmm)

  const order = [1, 2, 3, 4, 5, 6, 0]

  return (
    <div className="screen plano">
      <header className="page-h">
        <span className="eyebrow">{t('Seu plano')}</span>
        <h1 className="ttl">
          {t('Treino e dieta')}
          <Info text={t('Seu treino e suas refeições de cada dia da semana. Toque num dia para ver o plano dele. Hoje você marca o que já fez.')} />
        </h1>
      </header>

      <div className="pl-days" role="tablist">
        {order.map((d) => {
          const has = p.workouts.some((w) => w.weekday === d && w.items.trim())
          return (
            <button key={d} type="button" role="tab" aria-selected={day === d} className={`pl-day ${day === d ? 'on' : ''} ${d === now.getDay() ? 'today' : ''}`} onClick={() => setDay(d)}>
              <small>{weekday(d).slice(0, 3)}</small>
              <i className={has ? 'train' : 'rest'}>{has ? <Icon name="dumbbell" size={13} /> : <Icon name="bed" size={12} />}</i>
            </button>
          )
        })}
      </div>

      <div className="seg-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'treino'} className={view === 'treino' ? 'on' : ''} onClick={() => setView('treino')}>
          <Icon name="dumbbell" size={16} /> {t('Treino')}
        </button>
        <button type="button" role="tab" aria-selected={view === 'dieta'} className={view === 'dieta' ? 'on' : ''} onClick={() => setView('dieta')}>
          <Icon name="food" size={16} /> {t('Dieta')}
        </button>
      </div>

      {view === 'treino' && (
        <>
          {!p.workouts.some((w) => w.items.trim()) ? (
            <section className="card pl-empty">
              <b>{t('Você ainda não cadastrou sua ficha de treino')}</b>
              <p>{t('Escreva os exercícios de cada dia ou envie o PDF do seu personal.')}</p>
              <button type="button" className="cta" onClick={() => goMenu('treino')}>
                {t('Cadastrar ficha de treino')}
              </button>
            </section>
          ) : !wk ? (
            <section className="card pl-rest">
              <span className="pl-rest-ic">
                <Icon name="bed" size={26} />
              </span>
              <b>{isToday ? t('Hoje é dia de descanso') : t('{d} é dia de descanso', { d: weekday(day) })}</b>
              <p>{t('Descanso também é treino: é quando o músculo cresce. Mantenha a dieta e durma bem.')}</p>
            </section>
          ) : (
            <section className="card pl-train">
              <div className="pl-train-h">
                <div>
                  <small>
                    {isToday ? t('Hoje') : weekday(day)} · {p.trainTime}
                  </small>
                  <b>{wk.title}</b>
                </div>
                {isToday && (
                  <span className="pl-count">
                    {exDone}/{exercises.length}
                  </span>
                )}
              </div>
              {isToday && (
                <div className="pl-bar">
                  <span style={{ width: `${exercises.length ? (exDone / exercises.length) * 100 : 0}%` }} />
                </div>
              )}
              <ol className="pl-ex">
                {exercises.map((e, i) => {
                  const done = isToday && !!checks[`ex:${i}`]
                  return (
                    <li key={i} className={done ? 'done' : ''}>
                      <span className="pl-ex-n">{i + 1}</span>
                      <span className="pl-ex-t">
                        <b>{e.name}</b>
                        {e.extra && <small>{e.extra}</small>}
                      </span>
                      {e.sets && <span className="pl-sets">{e.sets}</span>}
                      {isToday && (
                        <button
                          type="button"
                          className={`tick ${done ? 'on' : ''}`}
                          aria-label={done ? t('Desmarcar') : t('Marcar como feito')}
                          onClick={() => {
                            const willAll = !done && exDone + 1 === exercises.length
                            toggle(`ex:${i}`, willAll ? { train: true } : undefined)
                            if (willAll) toast(t('Treino completo'), t('Marquei o treino como feito na tela Hoje.'))
                          }}
                        >
                          {done && <Icon name="check" size={16} stroke={3} />}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ol>
              {isToday && <RestTimer />}
            </section>
          )}
          {p.workouts.some((w) => w.items.trim()) && (
            <button type="button" className="link pl-edit" onClick={() => goMenu('treino')}>
              <Icon name="list" size={16} /> {t('Editar ficha de treino')}
            </button>
          )}
        </>
      )}

      {view === 'dieta' && (
        <>
          {meals.length === 0 || !meals.some((m) => m.items.trim()) ? (
            <section className="card pl-empty">
              <b>{t('Você ainda não cadastrou o que comer em cada refeição')}</b>
              <p>{t('Escreva os alimentos de cada refeição ou envie o PDF do seu nutricionista.')}</p>
              <button type="button" className="cta" onClick={() => goMenu('dieta')}>
                {t('Cadastrar plano alimentar')}
              </button>
            </section>
          ) : (
            <>
              {isToday && (
                <div className="pl-sum card">
                  <span>
                    <b>{t('{a} de {b} refeições', { a: mealsDone, b: meals.length })}</b>
                    <small>{nextMeal ? t('Próxima: {m} às {h}', { m: nextMeal.name, h: nextMeal.time }) : mealsDone === meals.length ? t('Dieta do dia cumprida.') : t('Marque as refeições que você já fez.')}</small>
                  </span>
                  <div className="pl-bar">
                    <span style={{ width: `${(mealsDone / meals.length) * 100}%` }} />
                  </div>
                </div>
              )}
              <ol className="pl-meals">
                {meals.map((m) => {
                  const done = isToday && !!checks[m.id]
                  const state = !isToday ? '' : done ? 'done' : m === nextMeal ? 'next' : m.time < hhmm ? 'late' : ''
                  return (
                    <li key={m.id} className={`card pl-meal ${state}`}>
                      <div className="pl-meal-h">
                        <span className="pl-time">{m.time}</span>
                        <b>{m.name}</b>
                        {state === 'next' && <span className="pl-badge next">{t('Próxima')}</span>}
                        {state === 'late' && <span className="pl-badge late">{t('Atrasada')}</span>}
                      </div>
                      {m.items.trim() ? (
                        <ul className="pl-food">
                          {lines(m.items).flatMap((x) => x.split(/,\s+|\s+\+\s+|;\s*/)).filter(Boolean).map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      ) : (
                        <small className="muted">{t('Sem alimentos cadastrados.')}</small>
                      )}
                      {isToday && (
                        <button type="button" className={`pl-ate ${done ? 'on' : ''}`} onClick={() => toggle(m.id)}>
                          <Icon name="check" size={16} stroke={3} /> {done ? t('Comi') : t('Marcar: comi')}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ol>
              <button type="button" className="link pl-edit" onClick={() => goMenu('dieta')}>
                <Icon name="list" size={16} /> {t('Editar plano alimentar')}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
