import { Icon } from '../components/Icon'
import { Info, WithInfo } from '../components/Info'
import { Locked } from '../components/Locked'
import { notifyStatus } from '../notify'
import { trainLocked } from '../focus'
import { type RankRow, type User, api } from '../api'
import { useLatestPhoto, useRefPhoto } from '../usePhotos'
import { type Mission, levelOf, missions, nextStreakMedal, totalXP } from '../game'
import { getEvents, hhmmOf, onEvents, refreshEvents, ymdOf } from '../calendar'
import { useEffect, useState } from 'react'
import { Rings } from '../components/Rings'
import type { Tab } from '../components/BottomNav'
import { headline } from '../psych'
import { t, weekdayShort } from '../i18n'
import { type AppState, addDays, currentWeight, cycleInfo, getProjeto, weekStats, setState, streak, today, weekDays, workoutFor, ymd } from '../store'

type Kind = 'wake' | 'meal' | 'train' | 'checkin' | 'event' | 'task'
interface Task {
  id: string
  time: string
  title: string
  detail?: string
  kind: Kind
  done: boolean
}

const ICON: Record<Kind, string> = { wake: 'sun', meal: 'food', train: 'dumbbell', checkin: 'list', event: 'calendar', task: 'check' }

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
      diet: Object.values(log.mealsOk || {}).filter(Boolean).length / meals,
      cardio: log.cardioMin / dailyCardio,
      rest: !wk,
    }
  }
  return { train: !wk ? 1 : checks.train ? 1 : 0, diet: p.meals.filter((m) => checks[m.id]).length / meals, cardio: 0, rest: !wk }
}

export function Today({ s, user, go, goMenu, openCheckin, owes, onMission, openCoach, onLocked }: { s: AppState; user?: User | null; go: (tab: Tab) => void; goMenu: (sec: string) => void; openCheckin: () => void; owes: boolean; onMission: (a: Mission['action']) => void; openCoach?: () => void; onLocked?: () => void }) {
  const [view, setView] = useState<'geral' | 'dia'>(() => {
    try {
      if (sessionStorage.getItem('sd:view') === 'dia') {
        sessionStorage.removeItem('sd:view')
        return 'dia'
      }
    } catch {
      /* ignora */
    }
    return 'geral'
  })
  const myPhoto = useLatestPhoto(s, user?.id, user?.hasAvatar)
  const needNotif = notifyStatus() !== 'granted'
  // dia ruim: pouca leitura, só o porquê e uma ação
  const stk = streak(s)
  const focus = trainLocked(s)
  const lowTitle = stk >= 7 ? t('{n} dias seguidos. Não para hoje.', { n: stk }) : Object.keys(s.daily).length && !s.daily[ymd(addDays(new Date(), -1))] ? t('Ontem não contou. Hoje recomeça.') : t('Hoje é dia de chegar na academia.')
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
  const overall = (Math.min(1, prog.train) + Math.min(1, prog.diet) + Math.min(1, prog.cardio)) / 3
  const lv = levelOf(totalXP(s))
  const ms = missions(s)
  const msDone = ms.filter((m) => m.done).length
  const nextMedal = nextStreakMedal(s)
  const atRisk = !log && hhmm >= '19:00'

  const tasks: Task[] = [
    { id: 'wake', time: p.wake, title: t('Acordar e beber água'), kind: 'wake' as Kind, done: !!checks.wake },
    ...p.meals.map((m) => ({ id: m.id, time: m.time, title: m.name, detail: m.items, kind: 'meal' as Kind, done: !!checks[m.id] })),
    ...(p.tasks ?? []).filter((x) => x.title.trim()).map((x) => ({ id: x.id, time: x.time, title: x.title, kind: 'task' as Kind, done: !!checks[x.id] })),
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
      <header className="top-bar">
        <span className="me-ring sm" style={{ ['--p' as string]: `${Math.round(cyc.pct * 360)}deg` }}>
          <span className="me-photo">{myPhoto ? <img src={myPhoto} alt="" /> : (p.name || '?').slice(0, 1).toUpperCase()}</span>
        </span>
        <span className="top-hello">
          <small>{greeting()},</small>
          <b>{(p.name || t('você')).split(' ')[0]}</b>
        </span>
        {needNotif && (
          <button type="button" className="bell-pill" onClick={() => go('cobrancas')}>
            {t('Ativar avisos')} <Icon name="arrow" size={14} />
          </button>
        )}
        <button type="button" className={`bell-btn ${needNotif ? 'bell-alert' : ''}`} title={t('Mensagens do treinador')} onClick={() => go('cobrancas')} aria-label={needNotif ? t('Ativar avisos') : t('Mensagens do treinador')}>
          <Icon name="bell" size={22} />
          {needNotif ? <i className="bell-bang">!</i> : owes && <i className="bnav-dot" />}
        </button>
      </header>

      <h1 className="big-head">
        <span>{t('Dia {a} de {b}.', { a: cyc.day, b: p.cycleDays })}</span>
        <b>
          {t('Sem desculpa hoje.')}
          <Info text={t('Sua tela principal. Visão geral mostra seu progresso; Seu dia mostra o que fazer agora e a lista de hoje.')} />
        </b>
      </h1>

      <div className="seg-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'geral'} className={view === 'geral' ? 'on' : ''} onClick={() => setView('geral')}>
          {t('Visão geral')}
        </button>
        <button type="button" role="tab" aria-selected={view === 'dia'} className={view === 'dia' ? 'on' : ''} onClick={() => setView('dia')}>
          {t('Seu dia')}
          {pending.length > 0 && <i className="tab-count">{pending.length}</i>}
        </button>
      </div>

      {view === 'geral' && focus && (
        <>
          <section className="low" style={refPhoto ? { backgroundImage: `linear-gradient(180deg, rgba(5,10,25,.25), rgba(5,10,25,.92)), url(${refPhoto})` } : undefined}>
            <b className="low-h">{lowTitle}</b>
            {getProjeto(s).vision.why?.trim() && <p className="low-why">"{getProjeto(s).vision.why}"</p>}
            <span className="low-m">{t('Missão de hoje: chegar na academia')}</span>
            <button type="button" className="cta" onClick={openCoach}>
              {t('Falar com o treinador')}
            </button>
            <button type="button" className="low-ok" onClick={() => setState((x) => ({ ...x, checks: { ...x.checks, [key]: { ...(x.checks[key] || {}), gym: true } } }))}>
              <Icon name="check" size={16} stroke={3} /> {t('Cheguei na academia')}
            </button>
          </section>
          <PlanCard s={s} go={go} />
          <p className="ttl hint">
            <Icon name="lock" size={14} /> {t('Libera depois do treino')}
          </p>
          <div className="lock-grid">
            {[
              ['flame', t('Progresso de hoje')],
              ['check', t('Missões')],
              ['trophy', t('Ranking')],
              ['star', t('Seu nível')],
              ['photo', t('Antes x Depois')],
              ['target', t('Projetinho')],
            ].map(([ic, l]) => (
              <button key={l} type="button" className="card lock-tile" onClick={onLocked}>
                <Icon name={ic} size={20} />
                <span>{l}</span>
                <i>
                  <Icon name="lock" size={12} stroke={2.6} />
                </i>
              </button>
            ))}
          </div>
        </>
      )}
      {view === 'geral' && !focus && (
        <>
          {atRisk && (
            <button type="button" className="risk" onClick={openCheckin}>
              <span className="risk-ic">
                <Icon name="flame" size={20} />
              </span>
              <span className="risk-txt">
                <b>{st > 0 ? t('Sua sequência de {n} dias termina à meia-noite', { n: st }) : t('Hoje ainda não conta. Preste contas até a meia-noite.')}</b>
                <small>{t('Leva menos de 1 minuto. Toque para prestar contas agora.')}</small>
              </span>
              <Icon name="chevR" />
            </button>
          )}
          <section className="prog-card">
            <div className="prog-head">
              <span>{t('Progresso de hoje')}</span>
              <Info light text={t('Quanto do seu dia você já cumpriu: treino, refeições do plano e cardio. Fecha em 100% quando tudo estiver feito.')} />
            </div>
            <div className="prog-body">
              <div className="prog-ring">
                <Rings size={128} values={[{ v: overall, color: 'var(--accent)' }]} />
                <b>
                  {Math.round(overall * 100)}
                  <small>%</small>
                </b>
              </div>
              <ul className="prog-list">
                <li>
                  <i className="dot" style={{ background: 'var(--ring-1)' }} />
                  <span>{t('Treino')}</span>
                  <b>{prog.rest ? (s.profile.workouts.some((w) => w.items.trim()) ? t('Descanso') : t('Sem ficha')) : prog.train >= 1 ? t('Feito') : t('Falta')}</b>
                </li>
                <li>
                  <i className="dot" style={{ background: 'var(--ring-2)' }} />
                  <span>{t('Dieta')}</span>
                  <b>{Math.round(prog.diet * 100)}%</b>
                </li>
                <li>
                  <i className="dot" style={{ background: 'var(--ring-3)' }} />
                  <span>{t('Cardio')}</span>
                  <b>{prog.cardio >= 1 ? t('Feito') : t('Falta')}</b>
                </li>
                <li>
                  <i className="dot" style={{ background: '#ffb020' }} />
                  <span>{t('Sequência')}</span>
                  <b>{st === 1 ? t('1 dia') : t('{n} dias', { n: st })}</b>
                </li>
              </ul>
            </div>
          </section>

          <section className="card missions">
            <div className="block-h">
              <h2 className="ttl">
                {t('Missões de hoje')}
                <Info text={t('Três missões por dia. Cada uma vale pontos para subir de nível. Elas mudam todo dia conforme o que falta no seu projeto.')} />
              </h2>
              <span className="soft-chip">{t('{a} de {b}', { a: msDone, b: ms.length })}</span>
            </div>
            {msDone === ms.length ? (
              <div className="missions-done">
                <Icon name="check" size={20} stroke={3} />
                <span>
                  <b>{t('Missões cumpridas.')}</b>
                  <small>{t('Volte amanhã: novas missões esperam por você.')}</small>
                </span>
              </div>
            ) : (
              <ul className="mission-list">
                {ms.map((m) => (
                  <li key={m.id}>
                    <button type="button" className={`mission ${m.done ? 'done' : ''}`} onClick={() => !m.done && (m.action === 'dia' ? setView('dia') : onMission(m.action))} disabled={m.done}>
                      <span className="mission-ic">{m.done ? <Icon name="check" size={16} stroke={3} /> : <Icon name={m.icon} size={16} />}</span>
                      <span className="mission-txt">
                        <b>{m.title}</b>
                        {m.progress && !m.done && <small>{t('{a} de {b}', { a: m.progress[0], b: m.progress[1] })}</small>}
                      </span>
                      <span className="mission-xp">+{m.xp}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

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


          <PlanCard s={s} go={go} />
          <RankCard online={!!user} go={go} />

          <button type="button" className="level-card" onClick={() => go('conquistas')}>
            <span className="level-badge">
              <small>{t('Nível')}</small>
              <b>{lv.n}</b>
            </span>
            <span className="level-txt">
              <b>{lv.name}</b>
              <span className="level-bar">
                <span style={{ width: `${Math.round(lv.pct * 100)}%` }} />
              </span>
              <small>
                {lv.next ? t('{a} de {b} pontos', { a: lv.xp, b: lv.next }) : t('{a} pontos', { a: lv.xp })}
                {nextMedal && ` · ${t('medalha de {n} dias em {k}', { n: nextMedal.target, k: nextMedal.left })}`}
              </small>
            </span>
            <Icon name="chevR" />
          </button>

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

/** Cartão do ranking: posição entre amigos ou convite para chamar amigos. */
function RankCard({ online, go }: { online: boolean; go: (tab: Tab) => void }) {
  const [rows, setRows] = useState<RankRow[] | null>(null)
  useEffect(() => {
    if (!online) return
    let alive = true
    api.ranking('friends').then((r) => alive && setRows(r.rows), () => {})
    return () => {
      alive = false
    }
  }, [online])
  if (!online || !rows) return null
  const me = rows.find((r) => r.me)
  const solo = rows.length < 2
  const ahead = me && me.pos > 1 ? rows[me.pos - 2] : null
  return (
    <button type="button" className="card rank-card" onClick={() => go('ranking')}>
      <span className="rank-pos">{solo ? <Icon name="user" size={22} /> : <b>{me?.pos}º</b>}</span>
      <span className="rank-txt">
        <b>{solo ? t('Desafie seus amigos') : t('{p}º de {n} no ranking da semana', { p: me?.pos ?? 1, n: rows.length })}</b>
        <small>
          {solo
            ? t('Convide amigos e vejam quem cumpre mais a semana.')
            : ahead
              ? t('Faltam {n} pontos para passar {name}.', { n: ahead.points - (me?.points ?? 0) + 1, name: ahead.name.split(' ')[0] })
              : t('Você está na frente. Não deixe ninguém passar.')}
        </small>
      </span>
      <Icon name="chevR" />
    </button>
  )
}

/** Atalho para Treino e dieta: o treino de hoje e a próxima refeição. */
function PlanCard({ s, go }: { s: AppState; go: (tab: Tab) => void }) {
  const p = s.profile
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const wk = workoutFor(p, now)
  const checks = s.checks[today()] || {}
  const next = p.meals.slice().sort((a, b) => a.time.localeCompare(b.time)).find((m) => !checks[m.id] && m.time >= hhmm)
  return (
    <button type="button" className="card plan-card" onClick={() => go('plano')}>
      <span className="plan-card-h">
        <b>{t('Treino e dieta de hoje')}</b>
        <Icon name="chevR" />
      </span>
      <span className="plan-card-row">
        <span className="plan-ic">
          <Icon name="dumbbell" size={18} />
        </span>
        <span>
          <small>{t('Treino')}</small>
          <b>{wk ? `${wk.title} · ${p.trainTime}` : p.workouts.some((w) => w.items.trim()) ? t('Descanso') : t('Ficha não cadastrada')}</b>
        </span>
      </span>
      <span className="plan-card-row">
        <span className="plan-ic food">
          <Icon name="food" size={18} />
        </span>
        <span>
          <small>{t('Próxima refeição')}</small>
          <b>{next ? `${next.name} · ${next.time}` : t('Nenhuma pendente')}</b>
        </span>
      </span>
    </button>
  )
}
