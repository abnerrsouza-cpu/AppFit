import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Info, WithInfo } from '../components/Info'
import { type User, api, avatarUrl } from '../api'
import { LANGS, t, weekday } from '../i18n'
import { compress } from '../photos'
import { type AppState, type Profile, bmi, currentWeight, newId, resetToBlank, resetToDemo, setLang, setState } from '../store'

type Section = null | 'perfil' | 'rotina' | 'treino' | 'dieta' | 'agenda' | 'relogio' | 'carta'

export function Menu({ s, user = null, onLogout, initialSec = null, onOpened }: { s: AppState; user?: User | null; onLogout?: () => void; initialSec?: string | null; onOpened?: () => void }) {
  const [avatarV, setAvatarV] = useState(0)
  const [hasAvatar, setHasAvatar] = useState(!!user?.hasAvatar)
  const changeAvatar = async (f?: File) => {
    if (!f || !user) return
    try {
      await api.setAvatar(await compress(f, 320))
      setHasAvatar(true)
      setAvatarV((v) => v + 1)
    } catch {
      /* ignora */
    }
  }
  const [sec, setSec] = useState<Section>(initialSec as Section)
  useEffect(() => {
    if (initialSec) onOpened?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [confirm, setConfirm] = useState(false)
  const p = s.profile
  const upd = (patch: Partial<Profile>) => setState((st) => ({ ...st, profile: { ...st.profile, ...patch } }))

  if (sec) {
    return (
      <div className="screen">
        <div className="sheet-h">
          <button type="button" className="round-btn" onClick={() => setSec(null)} aria-label={t('Voltar')}>
            <Icon name="back" />
          </button>
          <span className="eyebrow">{t('Perfil')}</span>
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
        <label className={`avatar ${user ? 'editable' : ''}`}>
          {user && hasAvatar ? <img src={avatarUrl(user.id, avatarV)} alt="" /> : (p.name || '?').slice(0, 1).toUpperCase()}
          {user && (
            <>
              <input id="pf-avatar" type="file" accept="image/*" onChange={(e) => changeAvatar(e.target.files?.[0])} />
              <i className="avatar-edit">
                <Icon name="camera" size={12} />
              </i>
            </>
          )}
        </label>
        <span>
          <b className="ttl">
            {p.name || t('Sem nome')}
            <Info text={t('Seu perfil. Aqui você ajusta seus dados, sua rotina, seus planos, o tema e o idioma do app.')} />
          </b>
          <small>
            {t(p.goal)} · {p.height} cm · {currentWeight(s).toFixed(1)} kg
          </small>
          {user && <small>{user.email}</small>}
        </span>
      </div>

      <div className="card menu-group">
        <span className="group-label ttl">
          {t('Seus dados')}
          <Info text={t('Peso, altura e objetivo; os horários da sua rotina; e a carta que o treinador usa para te cobrar.')} />
        </span>
        <Row id="perfil" icon="user" title={t('Perfil e medidas')} sub={t('Peso, altura, idade, objetivo')} />
        <Row id="rotina" icon="sun" title={t('Rotina')} sub={t('Acorda {a} · treina {b} · dorme {c}', { a: p.wake, b: p.trainTime, c: p.sleep })} />
        <Row id="carta" icon="quote" title={t('Carta de compromisso')} sub={t('Usada nas cobranças')} />
      </div>

      <div className="card menu-group">
        <span className="group-label ttl">
          {t('Planos')}
          <Info text={t('Seu treino de cada dia da semana e suas refeições. Cada refeição vira uma cobrança no horário.')} />
        </span>
        <Row id="treino" icon="dumbbell" title={t('Ficha de treino')} sub={t('{n} dias por semana', { n: p.workouts.length })} />
        <Row id="dieta" icon="food" title={t('Plano alimentar')} sub={t('{n} refeições por dia', { n: p.meals.length })} />
      </div>

      <div className="card menu-group">
        <span className="group-label ttl">
          {t('Conexões')}
          <Info text={t('Ligue sua agenda do Google e, em breve, seu relógio de treino, para o app cobrar com base neles.')} />
        </span>
        <Row id="agenda" icon="calendar" title={t('Google Agenda')} sub={p.icalUrl ? t('Conectada') : t('Colar link público')} />
        <Row id="relogio" icon="watch" title={t('Relógio de treino')} sub={t('Strava · em breve')} />
      </div>

      <p className="ttl hint">
        {t('Tema')}
        <Info text={t('Claro deixa o app branco. Escuro deixa o app preto, melhor à noite.')} />
      </p>
      <div className="theme-switch" role="group" aria-label={t('Tema')}>
        <button type="button" className={s.theme === 'light' ? 'on' : ''} onClick={() => setState((st) => ({ ...st, theme: 'light' }))}>
          <Icon name="sun" size={18} /> {t('Claro')}
        </button>
        <button type="button" className={s.theme === 'dark' ? 'on' : ''} onClick={() => setState((st) => ({ ...st, theme: 'dark' }))}>
          <Icon name="moon" size={18} /> {t('Escuro')}
        </button>
      </div>

      {s.demo ? (
        <WithInfo text={t('Apaga os dados de exemplo e começa o seu cadastro do zero.')}>
          <button type="button" className="cta" onClick={resetToBlank}>
            {t('Sair do exemplo e começar o meu desafio')}
          </button>
        </WithInfo>
      ) : confirm ? (
        <div className="card confirm">
          <b>{t('Apagar todos os seus dados?')}</b>
          <small>{t('Check-ins, fotos e configurações deste aparelho. Não dá para desfazer.')}</small>
          <div className="row2">
            <button type="button" className="ghost-btn" onClick={() => setConfirm(false)}>
              {t('Cancelar')}
            </button>
            <button type="button" className="danger-btn" onClick={resetToBlank}>
              {t('Apagar')}
            </button>
          </div>
        </div>
      ) : (
        <WithInfo text={t('Apaga todos os seus dados deste celular e volta para o cadastro. Pede confirmação antes.')}>
          <button type="button" className="ghost-btn" onClick={() => setConfirm(true)}>
            <Icon name="logout" size={18} /> {t('Recomeçar do zero')}
          </button>
        </WithInfo>
      )}
      {onLogout && (
        <WithInfo text={t('Sai da sua conta neste celular. Seus dados continuam salvos no servidor.')}>
          <button type="button" className="ghost-btn" onClick={onLogout}>
            <Icon name="logout" size={18} /> {t('Sair da conta')}
          </button>
        </WithInfo>
      )}
      {!s.demo && !user && (
        <button type="button" className="link center" onClick={resetToDemo}>
          {t('Ver dados de exemplo')}
        </button>
      )}
      <LangPicker s={s} />
    </div>
  )
}

type Upd = (p: Partial<Profile>) => void

function Perfil({ p, upd, weight }: { p: Profile; upd: Upd; weight: number }) {
  const b = bmi(weight, p.height)
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1 className="ttl">
        {t('Perfil e medidas')}
        <Info text={t('Seus dados básicos. O peso inicial e o peso meta desenham a trilha em Rumo à meta.')} />
      </h1>
      <div className="card field">
        <label>
          {t('Nome')}
          <input id="pf-name" value={p.name} onChange={(e) => upd({ name: e.target.value })} />
        </label>
        <label>
          {t('Objetivo')}
          <select id="pf-goal" value={p.goal} onChange={(e) => upd({ goal: e.target.value })}>
            {['Perder gordura', 'Perder gordura e ganhar definição', 'Ganhar massa', 'Manter e ter constância'].map((g) => (
              <option key={g} value={g}>{t(g)}</option>
            ))}
          </select>
        </label>
        <div className="row2">
          <label>
            {t('Idade')}
            <input id="pf-age" type="number" inputMode="numeric" value={p.age} onChange={(e) => upd({ age: Number(e.target.value) })} />
          </label>
          <label>
            {t('Altura (cm)')}
            <input id="pf-height" type="number" inputMode="numeric" value={p.height} onChange={(e) => upd({ height: Number(e.target.value) })} />
          </label>
        </div>
        <div className="row2">
          <label>
            {t('Peso inicial (kg)')}
            <input id="pf-w0" type="number" step={0.1} inputMode="decimal" value={p.weightStart} onChange={(e) => upd({ weightStart: Number(e.target.value) })} />
          </label>
          <label>
            {t('Peso meta (kg)')}
            <input id="pf-wg" type="number" step={0.1} inputMode="decimal" value={p.weightGoal} onChange={(e) => upd({ weightGoal: Number(e.target.value) })} />
          </label>
        </div>
        <label>
          {t('Meta de cardio por semana (min)')}
          <input id="pf-cardio" type="number" inputMode="numeric" value={p.cardioGoalMin} onChange={(e) => upd({ cardioGoalMin: Number(e.target.value) })} />
        </label>
      </div>
      <div className="card kv-card">
        <div className="kv">
          <span>{t('Peso atual')}</span>
          <b>{weight.toFixed(1)} kg</b>
          <span>{t('IMC')}</span>
          <b>{b.toFixed(1)}</b>
          <span>{t('Falta para a meta')}</span>
          <b>{Math.max(0, weight - p.weightGoal).toFixed(1)} kg</b>
        </div>
        <small className="muted">{t('O peso atual vem do check-in semanal.')}</small>
      </div>
    </form>
  )
}

function Rotina({ p, upd }: { p: Profile; upd: Upd }) {
  const T = ({ k, l }: { k: 'wake' | 'trainTime' | 'checkinTime' | 'sleep'; l: string }) => (
    <label>
      {t(l)}
      <input id={`rt-${k}`} type="time" value={p[k]} onChange={(e) => upd({ [k]: e.target.value })} />
    </label>
  )
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1 className="ttl">
        {t('Rotina')}
        <Info text={t('Os horários do seu dia. O app manda as cobranças nesses horários.')} />
      </h1>
      <p className="lead">{t('Esses horários definem quando o app te cobra.')}</p>
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
      <h1 className="ttl">
        {t('Ficha de treino')}
        <Info text={t('Ligue os dias em que você treina e escreva os exercícios, um por linha. A ficha aparece na tela Hoje.')} />
      </h1>
      <p className="lead">{t('Um exercício por linha. Dias desligados são descanso.')}</p>
      {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
        const w = p.workouts.find((x) => x.weekday === wd)
        return (
          <div key={wd} className="card field">
            <div className="field-top">
              <b className="cap">{weekday(wd)}</b>
              <button type="button" className={`switch ${w ? 'on' : ''}`} onClick={() => set(wd, w ? null : {})} aria-label={`${t('Treino')}: ${weekday(wd)}`} aria-pressed={!!w}>
                <i />
              </button>
            </div>
            {w && (
              <>
                <input id={`tr-t-${wd}`} value={w.title} onChange={(e) => set(wd, { title: e.target.value })} placeholder={t('Nome do treino')} />
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
      <h1 className="ttl">
        {t('Plano alimentar')}
        <Info text={t('Suas refeições do dia com horário e o que comer. Cada uma vira uma tarefa na tela Hoje e uma cobrança.')} />
      </h1>
      <p className="lead">{t('Cada refeição vira uma notificação no horário.')}</p>
      {p.meals
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((m) => (
          <div key={m.id} className="card field">
            <div className="row2">
              <input id={`dt-n-${m.id}`} value={m.name} onChange={(e) => set(m.id, { name: e.target.value })} aria-label={t('Nome da refeição')} />
              <input id={`dt-t-${m.id}`} type="time" value={m.time} onChange={(e) => set(m.id, { time: e.target.value })} aria-label={t('Horário')} />
            </div>
            <textarea id={`dt-i-${m.id}`} rows={2} value={m.items} onChange={(e) => set(m.id, { items: e.target.value })} placeholder={t('O que comer')} />
            <button type="button" className="link danger" onClick={() => upd({ meals: p.meals.filter((x) => x.id !== m.id) })}>
              {t('Remover refeição')}
            </button>
          </div>
        ))}
      <button type="button" className="ghost-btn" onClick={() => upd({ meals: [...p.meals, { id: newId(), time: '10:00', name: t('Nova refeição'), items: '' }] })}>
        <Icon name="plus" size={18} /> {t('Adicionar refeição')}
      </button>
    </form>
  )
}

function Agenda({ p, upd }: { p: Profile; upd: Upd }) {
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1 className="ttl">
        {t('Google Agenda')}
        <Info text={t('Cole o link secreto da sua agenda. O app vai usar seus compromissos para te cobrar.')} />
      </h1>
      <p className="lead">{t('O app lê seus compromissos e cobra com base neles: "Você tinha Academia às 18h. Foi?"')}</p>
      <div className="card field">
        <label>
          {t('Endereço secreto no formato iCal')}
          <input id="ag-url" type="url" value={p.icalUrl} onChange={(e) => upd({ icalUrl: e.target.value.trim() })} placeholder="https://calendar.google.com/calendar/ical/.../basic.ics" />
        </label>
      </div>
      <ol className="steps card">
        <li>{t('Abra o Google Agenda no computador.')}</li>
        <li>{t('Configurações, depois clique na sua agenda.')}</li>
        <li>{t('Em "Integrar agenda", copie o "Endereço secreto no formato iCal".')}</li>
        <li>{t('Cole aqui.')}</li>
      </ol>
    </form>
  )
}

function Relogio() {
  return (
    <div className="form">
      <h1 className="ttl">
        {t('Relógio de treino')}
        <Info text={t('Em breve: o cardio do seu relógio entra sozinho na prestação de contas.')} />
      </h1>
      <div className="card field">
        <p>
          {t('A conexão vai ser pelo Strava, que recebe dados de Garmin, Amazfit, Polar, Coros, Apple Watch e outros. O cardio entra sozinho na prestação de contas.')}
        </p>
        <p className="muted">{t('Apple Saúde e Samsung Health não podem ser lidos por um app web. Para eles, sincronize com o Strava.')}</p>
        <button type="button" className="ghost-btn" disabled>
          <Icon name="lock" size={18} /> {t('Em breve')}
        </button>
      </div>
    </div>
  )
}

function Carta({ p, upd }: { p: Profile; upd: Upd }) {
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1 className="ttl">
        {t('Carta de compromisso')}
        <Info text={t('Uma carta sua para você mesmo. Nos dias ruins, o treinador mostra trechos dela.')} />
      </h1>
      <p className="lead">{t('Escreva para você mesmo daqui a {n} dias. Por que você começou? O que você não aguenta mais? O app vai te lembrar disso nos dias difíceis.', { n: p.cycleDays })}</p>
      <div className="card field">
        <textarea id="ct-letter" rows={8} value={p.letter} onChange={(e) => upd({ letter: e.target.value })} placeholder={t('Cansei de...')} />
      </div>
    </form>
  )
}

export function LangPicker({ s }: { s: AppState }) {
  const cur = s.lang ?? 'pt'
  return (
    <>
    <p className="ttl hint">
      {t('Idioma')}
      <Info text={t('Muda o idioma de todo o app: telas, cobranças e notificações.')} />
    </p>
    <div className="lang-pick" role="group" aria-label="Idioma / Language / Idioma">
      {LANGS.map((l) => (
        <button key={l.id} type="button" className={cur === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>
          <span>{l.flag}</span> {l.label}
        </button>
      ))}
    </div>
    </>
  )
}
