import { useState } from 'react'
import { Icon } from '../components/Icon'
import { type AppState, type Profile, WEEKDAYS, bmi, currentWeight, newId, resetToBlank, resetToDemo, setState } from '../store'

type Section = null | 'perfil' | 'rotina' | 'treino' | 'dieta' | 'agenda' | 'relogio' | 'carta'

export function Menu({ s }: { s: AppState }) {
  const [sec, setSec] = useState<Section>(null)
  const [confirm, setConfirm] = useState(false)
  const p = s.profile
  const upd = (patch: Partial<Profile>) => setState((st) => ({ ...st, profile: { ...st.profile, ...patch } }))

  if (sec) {
    return (
      <div className="screen">
        <div className="sheet-h">
          <button type="button" className="round-btn" onClick={() => setSec(null)} aria-label="Voltar">
            <Icon name="back" />
          </button>
          <span className="eyebrow">Menu</span>
        </div>
        {sec === 'perfil' && <Perfil p={p} upd={upd} weight={currentWeight(s)} />}
        {sec === 'rotina' && <Rotina p={p} upd={upd} />}
        {sec === 'treino' && <Treino p={p} upd={upd} />}
        {sec === 'dieta' && <Dieta p={p} upd={upd} />}
        {sec === 'agenda' && <Agenda p={p} upd={upd} />}
        {sec === 'relogio' && <Relogio />}
        {sec === 'carta' && <Carta p={p} upd={upd} />}
      </div>
    )
  }

  const Row = ({ id, icon, title, sub }: { id: Section; icon: string; title: string; sub: string }) => (
    <button type="button" className="menu-row" onClick={() => setSec(id)}>
      <span className="menu-ic">
        <Icon name={icon} size={20} />
      </span>
      <span>
        <b>{title}</b>
        <small>{sub}</small>
      </span>
      <Icon name="chevR" size={18} />
    </button>
  )

  return (
    <div className="screen">
      <div className="card profile-card">
        <span className="avatar">{(p.name || '?').slice(0, 1).toUpperCase()}</span>
        <span>
          <b>{p.name || 'Sem nome'}</b>
          <small>
            {p.goal} · {p.height} cm · {currentWeight(s).toFixed(1)} kg
          </small>
        </span>
      </div>

      <div className="card menu-group">
        <span className="group-label">Seus dados</span>
        <Row id="perfil" icon="user" title="Perfil e medidas" sub="Peso, altura, idade, objetivo" />
        <Row id="rotina" icon="sun" title="Rotina" sub={`Acorda ${p.wake} · treina ${p.trainTime} · dorme ${p.sleep}`} />
        <Row id="carta" icon="quote" title="Carta de compromisso" sub="Usada nas cobranças" />
      </div>

      <div className="card menu-group">
        <span className="group-label">Planos</span>
        <Row id="treino" icon="dumbbell" title="Ficha de treino" sub={`${p.workouts.length} dias por semana`} />
        <Row id="dieta" icon="food" title="Plano alimentar" sub={`${p.meals.length} refeições por dia`} />
      </div>

      <div className="card menu-group">
        <span className="group-label">Conexões</span>
        <Row id="agenda" icon="calendar" title="Google Agenda" sub={p.icalUrl ? 'Conectada' : 'Colar link público'} />
        <Row id="relogio" icon="watch" title="Relógio de treino" sub="Strava · em breve" />
      </div>

      <div className="theme-switch" role="group" aria-label="Tema">
        <button type="button" className={s.theme === 'light' ? 'on' : ''} onClick={() => setState((st) => ({ ...st, theme: 'light' }))}>
          <Icon name="sun" size={18} /> Claro
        </button>
        <button type="button" className={s.theme === 'dark' ? 'on' : ''} onClick={() => setState((st) => ({ ...st, theme: 'dark' }))}>
          <Icon name="moon" size={18} /> Escuro
        </button>
      </div>

      {s.demo ? (
        <button type="button" className="cta" onClick={resetToBlank}>
          Sair do exemplo e começar o meu desafio
        </button>
      ) : confirm ? (
        <div className="card confirm">
          <b>Apagar todos os seus dados?</b>
          <small>Check-ins, fotos e configurações deste aparelho. Não dá para desfazer.</small>
          <div className="row2">
            <button type="button" className="ghost-btn" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
            <button type="button" className="danger-btn" onClick={resetToBlank}>
              Apagar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="ghost-btn" onClick={() => setConfirm(true)}>
          <Icon name="logout" size={18} /> Recomeçar do zero
        </button>
      )}
      {!s.demo && (
        <button type="button" className="link center" onClick={resetToDemo}>
          Ver dados de exemplo
        </button>
      )}
    </div>
  )
}

type Upd = (p: Partial<Profile>) => void

function Perfil({ p, upd, weight }: { p: Profile; upd: Upd; weight: number }) {
  const b = bmi(weight, p.height)
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1>Perfil e medidas</h1>
      <div className="card field">
        <label>
          Nome
          <input id="pf-name" value={p.name} onChange={(e) => upd({ name: e.target.value })} />
        </label>
        <label>
          Objetivo
          <select id="pf-goal" value={p.goal} onChange={(e) => upd({ goal: e.target.value })}>
            {['Perder gordura', 'Perder gordura e ganhar definição', 'Ganhar massa', 'Manter e ter constância'].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <div className="row2">
          <label>
            Idade
            <input id="pf-age" type="number" inputMode="numeric" value={p.age} onChange={(e) => upd({ age: Number(e.target.value) })} />
          </label>
          <label>
            Altura (cm)
            <input id="pf-height" type="number" inputMode="numeric" value={p.height} onChange={(e) => upd({ height: Number(e.target.value) })} />
          </label>
        </div>
        <div className="row2">
          <label>
            Peso inicial (kg)
            <input id="pf-w0" type="number" step={0.1} inputMode="decimal" value={p.weightStart} onChange={(e) => upd({ weightStart: Number(e.target.value) })} />
          </label>
          <label>
            Peso meta (kg)
            <input id="pf-wg" type="number" step={0.1} inputMode="decimal" value={p.weightGoal} onChange={(e) => upd({ weightGoal: Number(e.target.value) })} />
          </label>
        </div>
        <label>
          Meta de cardio por semana (min)
          <input id="pf-cardio" type="number" inputMode="numeric" value={p.cardioGoalMin} onChange={(e) => upd({ cardioGoalMin: Number(e.target.value) })} />
        </label>
      </div>
      <div className="card kv-card">
        <div className="kv">
          <span>Peso atual</span>
          <b>{weight.toFixed(1)} kg</b>
          <span>IMC</span>
          <b>{b.toFixed(1)}</b>
          <span>Falta para a meta</span>
          <b>{Math.max(0, weight - p.weightGoal).toFixed(1)} kg</b>
        </div>
        <small className="muted">O peso atual vem do check-in semanal.</small>
      </div>
    </form>
  )
}

function Rotina({ p, upd }: { p: Profile; upd: Upd }) {
  const T = ({ k, l }: { k: 'wake' | 'trainTime' | 'checkinTime' | 'sleep'; l: string }) => (
    <label>
      {l}
      <input id={`rt-${k}`} type="time" value={p[k]} onChange={(e) => upd({ [k]: e.target.value })} />
    </label>
  )
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1>Rotina</h1>
      <p className="lead">Esses horários definem quando o app te cobra.</p>
      <div className="card field">
        <div className="row2">
          <T k="wake" l="Acordar" />
          <T k="sleep" l="Dormir" />
        </div>
        <div className="row2">
          <T k="trainTime" l="Treino" />
          <T k="checkinTime" l="Prestação de contas" />
        </div>
      </div>
    </form>
  )
}

function Treino({ p, upd }: { p: Profile; upd: Upd }) {
  const set = (wd: number, patch: { title?: string; items?: string } | null) => {
    const others = p.workouts.filter((w) => w.weekday !== wd)
    if (patch === null) return upd({ workouts: others })
    const cur = p.workouts.find((w) => w.weekday === wd) ?? { weekday: wd, title: 'Treino', items: '' }
    upd({ workouts: [...others, { ...cur, ...patch }].sort((a, b) => a.weekday - b.weekday) })
  }
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1>Ficha de treino</h1>
      <p className="lead">Um exercício por linha. Dias desligados são descanso.</p>
      {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
        const w = p.workouts.find((x) => x.weekday === wd)
        return (
          <div key={wd} className="card field">
            <div className="field-top">
              <b className="cap">{WEEKDAYS[wd]}</b>
              <button type="button" className={`switch ${w ? 'on' : ''}`} onClick={() => set(wd, w ? null : {})} aria-label={`Treino na ${WEEKDAYS[wd]}`} aria-pressed={!!w}>
                <i />
              </button>
            </div>
            {w && (
              <>
                <input id={`tr-t-${wd}`} value={w.title} onChange={(e) => set(wd, { title: e.target.value })} placeholder="Nome do treino" />
                <textarea id={`tr-i-${wd}`} rows={4} value={w.items} onChange={(e) => set(wd, { items: e.target.value })} placeholder={'Supino reto 4x10\nCrucifixo 3x12'} />
              </>
            )}
          </div>
        )
      })}
    </form>
  )
}

function Dieta({ p, upd }: { p: Profile; upd: Upd }) {
  const set = (id: string, patch: Partial<Profile['meals'][number]>) => upd({ meals: p.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) })
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1>Plano alimentar</h1>
      <p className="lead">Cada refeição vira uma notificação no horário.</p>
      {p.meals
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((m) => (
          <div key={m.id} className="card field">
            <div className="row2">
              <input id={`dt-n-${m.id}`} value={m.name} onChange={(e) => set(m.id, { name: e.target.value })} aria-label="Nome da refeição" />
              <input id={`dt-t-${m.id}`} type="time" value={m.time} onChange={(e) => set(m.id, { time: e.target.value })} aria-label="Horário" />
            </div>
            <textarea id={`dt-i-${m.id}`} rows={2} value={m.items} onChange={(e) => set(m.id, { items: e.target.value })} placeholder="O que comer" />
            <button type="button" className="link danger" onClick={() => upd({ meals: p.meals.filter((x) => x.id !== m.id) })}>
              Remover refeição
            </button>
          </div>
        ))}
      <button type="button" className="ghost-btn" onClick={() => upd({ meals: [...p.meals, { id: newId(), time: '10:00', name: 'Nova refeição', items: '' }] })}>
        <Icon name="plus" size={18} /> Adicionar refeição
      </button>
    </form>
  )
}

function Agenda({ p, upd }: { p: Profile; upd: Upd }) {
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1>Google Agenda</h1>
      <p className="lead">O app lê seus compromissos e cobra com base neles: "Você tinha Academia às 18h. Foi?"</p>
      <div className="card field">
        <label>
          Endereço secreto no formato iCal
          <input id="ag-url" type="url" value={p.icalUrl} onChange={(e) => upd({ icalUrl: e.target.value.trim() })} placeholder="https://calendar.google.com/calendar/ical/.../basic.ics" />
        </label>
      </div>
      <ol className="steps card">
        <li>Abra o Google Agenda no computador.</li>
        <li>Configurações, depois clique na sua agenda.</li>
        <li>Em "Integrar agenda", copie o "Endereço secreto no formato iCal".</li>
        <li>Cole aqui.</li>
      </ol>
    </form>
  )
}

function Relogio() {
  return (
    <div className="form">
      <h1>Relógio de treino</h1>
      <div className="card field">
        <p>
          A conexão vai ser pelo <b>Strava</b>, que recebe dados de Garmin, Amazfit, Polar, Coros, Apple Watch e outros. O cardio entra sozinho na prestação de contas.
        </p>
        <p className="muted">Apple Saúde e Samsung Health não podem ser lidos por um app web. Para eles, sincronize com o Strava.</p>
        <button type="button" className="ghost-btn" disabled>
          <Icon name="lock" size={18} /> Em breve
        </button>
      </div>
    </div>
  )
}

function Carta({ p, upd }: { p: Profile; upd: Upd }) {
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1>Carta de compromisso</h1>
      <p className="lead">Escreva para você mesmo daqui a {p.cycleDays} dias. Por que você começou? O que você não aguenta mais? O app vai te lembrar disso nos dias difíceis.</p>
      <div className="card field">
        <textarea id="ct-letter" rows={8} value={p.letter} onChange={(e) => upd({ letter: e.target.value })} placeholder="Cansei de..." />
      </div>
    </form>
  )
}
