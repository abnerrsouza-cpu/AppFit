import { Icon } from '../components/Icon'
import { Info, WithInfo } from '../components/Info'
import { Locked } from '../components/Locked'
import { notifyStatus } from '../notify'
import type { User } from '../api'
import { useLatestPhoto, useRefPhoto } from '../usePhotos'
import { getEvents, hhmmOf, onEvents, refreshEvents, ymdOf } from '../calendar'
import { useEffect, useState } from 'react'
import { Rings } from '../components/Rings'
import type { Tab } from '../components/BottomNav'
import { headline } from '../psych'
import { t, weekday, weekdayShort } from '../i18n'
import { type AppState, currentWeight, cycleInfo, daysBetween, getProjeto, parseYmd, weekStats, fmtDayMonth, setState, streak, today, weekDays, workoutFor, ymd } from '../store'

type Kind = 'wake' | 'meal' | 'train' | 'checkin' | 'event'
interface Task {
  id: string
  time: string
  title: string
  detail?: string
  kind: Kind
  done: boolean
}

const ICON: Record<Kind, string> = { wake: 'sun', meal: 'food', train: 'dumbbell', checkin: 'list', event: 'calendar' }

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

export function Today({ s, user, go, goMenu, openCheckin, owes }: { s: AppState; user?: User | null; go: (tab: Tab) => void; goMenu: (sec: string) => void; openCheckin: () => void; owes: boolean }) {
  const [view, setView] = useState<'geral' | 'dia'>('geral')
  const myPhoto = useLatestPhoto(s, user?.id, user?.hasAvatar)
  const refPhoto = useRefPhoto(s)
  const p = s.profile
  const now = new Date()
  const key = today()
  const hhmm = now.toTimeString().slice(0, 5)
  const checks = s.checks[key] || {}
  const log = s.daily[key]
  const wk = workoutFor(p, now)
  const [showFicha, setShowFicha] = useState(false)
  const [, bump] = useState(0)
  useEffect(() => {
    void refreshEvents()
    const off = onEvents(() => bump((n) => n + 1))
    return () => {
      off()
    }
  }, [])
  const todayEvents = getEvents().filter((e) => !e.allDay && ymdOf(e.start) === key)
  const st = streak(s)
  const prog = todayProgress(s)
  const cyc = cycleInfo(p)
  const ws = weekStats(s)
  const weight = currentWeight(s)
  const weightLeft = Math.max(0, +(weight - p.weightGoal).toFixed(1))
  const goalLeft = Math.max(0, daysBetween(now, parseYmd(getProjeto(s).vision.targetDate)))

  const tasks: Task[] = [
    { id: 'wake', time: p.wake, title: t('Acordar e beber água'), kind: 'wake' as Kind, done: !!checks.wake },
    ...p.meals.map((m) => ({ id: m.id, time: m.time, title: m.name, detail: m.items, kind: 'meal' as Kind, done: !!checks[m.id] })),
    ...(wk ? [{ id: 'train', time: p.trainTime, title: wk.title, detail: wk.items, kind: 'train' as Kind, done: !!checks.train }] : []),
    { id: 'checkin', time: p.checkinTime, title: t('Prestar contas do dia'), kind: 'checkin' as Kind, done: !!log },
    ...todayEvents.map((e) => ({ id: `ev:${e.uid}`, time: hhmmOf(e.start), title: e.title, kind: 'event' as Kind, done: !!checks[`ev:${e.uid}`] })),
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
      <header className="hero-me">
        <div className="hero-row">
          <span className="me-ring" style={{ ['--p' as string]: `${Math.round(cyc.pct * 360)}deg` }}>
            <span className="me-photo">{myPhoto ? <img src={myPhoto} alt="" /> : (p.name || '?').slice(0, 1).toUpperCase()}</span>
          </span>
          <div className="hero-txt">
            <span className="date-chip">
              {weekday(now.getDay())}, {fmtDayMonth(now)}
            </span>
            <h1 className="hi">
              {greeting()}, {(p.name || t('você')).split(' ')[0]}
              <Info text={t('Sua tela principal. Visão geral mostra seu progresso; Seu dia mostra o que fazer agora e a lista de hoje.')} />
            </h1>
          </div>
          <button type="button" className="bell-btn" title={t('Mensagens do treinador')} onClick={() => go('cobrancas')} aria-label={t('Mensagens do treinador')}>
            <Icon name="bell" size={22} />
            {owes && <i className="bnav-dot" />}
          </button>
        </div>
        <div className="hero-chips">
          <span>
            <Icon name="calendar" size={14} /> {t('Dia {a} de {b}', { a: cyc.day, b: p.cycleDays })}
          </span>
          <span>
            <Icon name="flame" size={14} /> {st === 1 ? t('1 dia seguido') : t('{n} dias seguidos', { n: st })}
          </span>
          <span>
            <Icon name="target" size={14} /> {t('Faltam {n} dias', { n: goalLeft })}
          </span>
        </div>
      </header>

      <div className="seg-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'geral'} className={view === 'geral' ? 'on' : ''} onClick={() => setView('geral')}>
          {t('Visão geral')}
        </button>
        <button type="button" role="tab" aria-selected={view === 'dia'} className={view === 'dia' ? 'on' : ''} onClick={() => setView('dia')}>
          {t('Seu dia')}
          {pending.length > 0 && <i className="tab-count">{pending.length}</i>}
        </button>
      </div>

      {view === 'geral' && (
        <>
          {current ? (
            <button type="button" className={`now-strip ${late ? 'is-late' : ''}`} onClick={() => setView('dia')}>
              <span className="now-strip-ic">
                <Icon name={ICON[current.kind]} size={20} />
              </span>
              <span className="now-strip-txt">
                <small>{late ? t('Agora') : `${t('Próximo')} · ${current.time}`}</small>
                <b>{current.title}</b>
              </span>
              <span className="now-strip-go">
                {t('Abrir')} <Icon name="chevR" size={16} />
              </span>
            </button>
          ) : (
            <div className="now-strip done">
              <span className="now-strip-ic">
                <Icon name="check" size={20} stroke={3} />
              </span>
              <span className="now-strip-txt">
                <b>{t('Dia cumprido.')}</b>
              </span>
            </div>
          )}

          <Setup s={s} go={go} goMenu={goMenu} />

          <section className="card today">
            <div className="today-rings">
              <Rings
                size={140}
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
                  <b>{t('Treino')}</b>
                  <small>{prog.rest ? t('Descanso') : prog.train >= 1 ? t('Feito') : t('Falta')}</small>
                </span>
              </li>
              <li>
                <i style={{ background: 'var(--ring-2)' }}>
                  <Icon name="food" size={16} />
                </i>
                <span>
                  <b>{t('Dieta')}</b>
                  <small>{t('{n}% das refeições', { n: Math.round(prog.diet * 100) })}</small>
                </span>
              </li>
              <li>
                <i style={{ background: 'var(--ring-3)' }}>
                  <Icon name="run" size={16} />
                </i>
                <span>
                  <b>{t('Cardio')}</b>
                  <small>{prog.cardio >= 1 ? t('Feito') : t('Falta')}</small>
                </span>
              </li>
            </ul>
          </section>

          <section className="card block">
            <div className="block-h">
              <h2 className="ttl">
                {t('Você hoje x Referência')}
                <Info text={t('À esquerda, sua foto mais recente. À direita, o shape que você quer. Toque para ver sua evolução.')} />
              </h2>
            </div>
            <button type="button" className="vs" onClick={() => go(refPhoto ? 'evolucao' : 'projeto')}>
              <span className="vs-photo">
                {myPhoto ? <img src={myPhoto} alt="" /> : <Icon name="camera" size={26} />}
                <small>{t('Você hoje')}</small>
              </span>
              <span className="vs-mid">
                <b>{weightLeft > 0 ? `${String(weightLeft).replace('.', ',')} kg` : t('Meta')}</b>
                <small>{weightLeft > 0 ? t('para a meta') : t('batida')}</small>
                <Icon name="arrow" size={18} />
              </span>
              <span className="vs-photo ref">
                {refPhoto ? <img src={refPhoto} alt="" /> : <Icon name="target" size={26} />}
                <small>{t('Referência')}</small>
              </span>
            </button>
          </section>

          <div className="grid2">
            <div className="card tile">
              <span className="tile-h">
                {t('Treinos')} <Icon name="dumbbell" size={18} />
              </span>
              <b className="tile-n">
                {ws.trained}
                <small>/{ws.planned}</small>
              </b>
              <span className="tile-s">{t('nesta semana')}</span>
            </div>
            <div className="card tile">
              <span className="tile-h">
                {t('Cardio')} <Icon name="run" size={18} />
              </span>
              <b className="tile-n">
                {ws.cardio}
                <small> min</small>
              </b>
              <div className="meter">
                <span style={{ width: `${Math.min(100, (ws.cardio / p.cardioGoalMin) * 100)}%` }} />
              </div>
            </div>
            <div className="card tile">
              <span className="tile-h">
                {t('Dieta')} <Icon name="food" size={18} />
              </span>
              <b className={`tile-n ${ws.diet >= 8 ? 'ok' : ws.diet >= 6 ? 'warn' : ws.checkins ? 'bad' : ''}`}>
                {ws.checkins ? ws.diet.toFixed(1) : '—'}
                <small>/10</small>
              </b>
              <span className="tile-s">{t('média da semana')}</span>
            </div>
            <div className="card tile">
              <span className="tile-h">
                {t('Peso')} <Icon name="scale" size={18} />
              </span>
              <b className="tile-n">
                {weight.toFixed(1)}
                <small> kg</small>
              </b>
              <span className="tile-s">{t('meta {n} kg', { n: p.weightGoal })}</span>
            </div>
          </div>

      <section className="streak-card">
        <div className="streak-main">
          <span className="streak-flame">
            <Icon name="flame" size={40} stroke={2.2} />
          </span>
          <div>
            <b className="streak-n">{st}</b>
            <span className="ttl">
              {t('dias sem falhar')}
              <Info light text={t('Quantos dias seguidos você prestou contas. Se pular um dia, volta para zero.')} />
            </span>
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
        </>
      )}

      {view === 'dia' && (
        <>
      {current ? (
        <section className={`now-card ${late ? 'is-late' : ''}`}>
          <div className="now-top">
            <span className="ttl">
              <span className="now-label">{late ? t('Agora') : `${t('Próximo')} · ${current.time}`}</span>
              <Info light text={t('A tarefa que você deve fazer agora. Toque em Feito quando cumprir. O card muda sozinho para a próxima.')} />
            </span>
            {late && current.time !== hhmm && <span className="now-time">{t('desde {h}', { h: current.time })}</span>}
          </div>
          <div className="now-main">
            <span className="now-emoji">
              <Icon name={ICON[current.kind]} size={30} />
            </span>
            <div>
              <b>{current.title}</b>
              {current.kind === 'meal' && current.detail && <p>{current.detail}</p>}
              {current.kind === 'train' && <p>{t('{n} exercícios', { n: (current.detail || '').split('\n').length })}</p>}
              {current.kind === 'checkin' && <p>{t('Leva menos de 1 minuto.')}</p>}
              {current.kind === 'event' && <p>{t('Compromisso da sua agenda.')}</p>}
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
            {current.kind === 'train' && (p.integrations?.wellhub || p.integrations?.totalpass) && (
              <button type="button" className="now-btn ghost" onClick={() => act(current)}>
                {t('Fiz check-in na academia')}
              </button>
            )}
            {current.kind === 'train' && (
              <button type="button" className="now-btn ghost" onClick={() => setShowFicha(!showFicha)}>
                {showFicha ? t('Fechar ficha') : t('Ver ficha')}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="now-card is-done">
          <span className="now-emoji">
            <Icon name="check" size={32} stroke={3} />
          </span>
          <b>{t('Dia cumprido.')}</b>
          <p>{t('Tudo marcado e prestação de contas enviada. Amanhã de novo.')}</p>
        </section>
      )}

      <WithInfo text={t('Recado do seu treinador. Muda conforme a hora e o que você já fez. Toque para ver todas as mensagens.')}>
        <button type="button" className="coach" onClick={() => go('cobrancas')}>
          <span className="coach-av">
            <Icon name="flame" size={20} />
          </span>
          <span className="coach-bubble">{headline(s)}</span>
        </button>
      </WithInfo>

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
            <h2 className="ttl">
              {t('Seu dia')}
              <Info text={t('Todas as tarefas de hoje. Toque no círculo para marcar como feita. Os anéis enchem: azul é treino, azul-claro é dieta, verde é cardio.')} />
            </h2>
            <small>
              {t('{a} de {b} feitos', { a: doneCount, b: tasks.length })}
            </small>
          </div>
        </div>
        <ul>
          {tasks.map((x) => (
            <li key={x.id} className={`trow ${x.done ? 'is-done' : ''} ${x === current ? 'is-current' : ''}`}>
              <span className="trow-time">{x.time}</span>
              <span className="trow-emoji">
                <Icon name={ICON[x.kind]} size={18} />
              </span>
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

        </>
      )}
    </div>
  )
}

/** Pendências de configuração. Cada card some quando a pessoa cumpre. */
function Setup({ s, go, goMenu }: { s: AppState; go: (tab: Tab) => void; goMenu: (sec: string) => void }) {
  const p = s.profile
  const items = [
    {
      done: notifyStatus() === 'granted',
      el: (
        <Locked
          key="notif"
          icon="bell"
          title={t('Ative as notificações para receber as cobranças no celular')}
          text={t('Sem isso, o app só te cobra quando você abre.')}
          onClick={() => go('cobrancas')}
        />
      ),
    },
    {
      done: p.meals.length > 0 && p.meals.some((m) => m.items.trim()),
      el: (
        <Locked
          key="dieta"
          icon="food"
          title={t('Cadastre sua dieta para receber as cobranças das refeições')}
          text={t('Escreva o horário e o que comer em cada refeição.')}
          onClick={() => goMenu('dieta')}
        />
      ),
    },
    {
      done: p.workouts.length > 0 && p.workouts.some((w) => w.items.trim()),
      el: (
        <Locked
          key="treino"
          icon="dumbbell"
          title={t('Cadastre sua ficha de treino para ver os exercícios do dia')}
          text={t('Escolha os dias de treino e escreva os exercícios.')}
          onClick={() => goMenu('treino')}
        />
      ),
    },
    {
      done: !!p.letter.trim(),
      el: (
        <Locked
          key="carta"
          icon="quote"
          title={t('Escreva sua carta de compromisso')}
          text={t('O treinador usa a carta para te cobrar nos dias difíceis.')}
          onClick={() => goMenu('carta')}
        />
      ),
    },
  ]
  const done = items.filter((i) => i.done).length
  if (done === items.length) return null
  return (
    <section className="setup">
      <div className="setup-h">
        <h2 className="ttl">
          {t('Complete para liberar tudo')}
          <Info text={t('Configurações que faltam para o app funcionar por completo. Toque em cada uma para resolver. Elas somem quando você termina.')} />
        </h2>
        <span className="soft-chip">{t('{a} de {b}', { a: done, b: items.length })}</span>
      </div>
      {items.filter((i) => !i.done).map((i) => i.el)}
    </section>
  )
}
