import { type ReactNode, useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Info, WithInfo } from '../components/Info'
import { type User, api, showEmail } from '../api'
import { LANGS, t, weekday } from '../i18n'
import { Integracoes } from './Integracoes'
import { AvatarPicker } from '../components/AvatarPicker'
import { PdfImport } from '../components/PdfImport'
import { RoutineTasks } from '../components/RoutineTasks'
import { IntroPhotos } from '../components/IntroPhotos'
import { LoginCta } from '../components/LoginCta'
import { toast } from '../components/Toast'
import { type AppState, type PlanMode, type Profile, bmi, currentWeight, newId, resetToBlank, resetToDemo, setLang, setState } from '../store'

type Section = null | 'perfil' | 'fotos' | 'rotina' | 'treino' | 'dieta' | 'agenda' | 'relogio' | 'carta' | 'integracoes'

export function Menu({ s, user = null, onUser, onLogout, onHow, onConquistas, onRanking, onPlano, onAgua, onAdmin, adminPending = 0, onPreviewIntro, initialSec = null, onOpened }: { s: AppState; user?: User | null; onUser?: (u: User) => void; onLogout?: () => void; onHow?: () => void; onConquistas?: () => void; onRanking?: () => void; onPlano?: () => void; onAgua?: () => void; onAdmin?: () => void; adminPending?: number; onPreviewIntro?: () => void; initialSec?: string | null; onOpened?: () => void }) {
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
        {sec === 'fotos' && <IntroPhotos s={s} userId={user?.id} hasAvatar={user?.hasAvatar} onPreview={() => onPreviewIntro?.()} />}
        {sec === 'rotina' && <Rotina p={p} upd={upd} extra={<RoutineTasks tasks={p.tasks} upd={upd} online={!!user} lang={s.lang || 'pt'} />} />}
        {sec === 'treino' && <Treino p={p} upd={upd} pdf={<PdfImport kind="workout" online={!!user} lang={s.lang || 'pt'} upd={upd} files={p.trainFiles} />} />}
        {sec === 'dieta' && <Dieta p={p} upd={upd} pdf={<PdfImport kind="diet" online={!!user} lang={s.lang || 'pt'} upd={upd} files={p.dietFiles} />} />}
        {sec === 'agenda' && <Agenda p={p} upd={upd} />}
        {sec === 'relogio' && <Relogio />}
        {sec === 'carta' && <Carta p={p} upd={upd} />}
        {sec === 'integracoes' && <Integracoes s={s} user={user} onUser={onUser} />}
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
        <AvatarPicker avatarId={p.avatarId} userId={user?.id} hasServerAvatar={user?.hasAvatar} name={p.name} />
        <span>
          <b className="ttl">
            {p.name || t('Sem nome')}
            <Info text={t('Seu perfil. Aqui você ajusta seus dados, sua rotina, seus planos, o tema e o idioma do app.')} />
          </b>
          <small>
            {t(p.goal)} · {p.height} cm · {currentWeight(s).toFixed(1)} kg
          </small>
        </span>
      </div>

      <Account user={user} onLogout={onLogout} />

      <div className="card menu-group">
        <span className="group-label ttl">
          {t('Seus dados')}
          <Info text={t('Peso, altura e objetivo; os horários da sua rotina; e a carta que o treinador usa para te cobrar.')} />
        </span>
        <Row id="perfil" icon="user" title={t('Perfil e medidas')} sub={t('Peso, altura, idade, objetivo')} />
        <Row id="fotos" icon="camera" title={t('Editar fotos da abertura')} sub={s.introOff ? t('Abertura pausada') : t('"Esse é você" e "Sua referência"')} />
        <Row id="rotina" icon="sun" title={t('Rotina')} sub={t('Acorda {a} · treina {b} · dorme {c}', { a: p.wake, b: p.trainTime, c: p.sleep })} />
        <Row id="carta" icon="quote" title={t('Carta de compromisso')} sub={t('Usada nas cobranças')} />
      </div>

      <div className="card menu-group">
        <span className="group-label ttl">
          {t('Planos')}
          <Info text={t('Seu treino de cada dia da semana e suas refeições. Cada refeição vira uma cobrança no horário.')} />
        </span>
        <button type="button" className="menu-row" onClick={onAgua}>
          <span className="menu-ic">
            <Icon name="droplet" size={20} />
          </span>
          <span>
            <b>{t('Controle de água')}</b>
            <small>{t('Quanto você bebeu hoje e na semana')}</small>
          </span>
          <Icon name="chevR" size={18} />
        </button>
        <button type="button" className="menu-row" onClick={onPlano}>
          <span className="menu-ic">
            <Icon name="dumbbell" size={20} />
          </span>
          <span>
            <b>{t('Ver treino e dieta')}</b>
            <small>{t('Seu plano detalhado de cada dia')}</small>
          </span>
          <Icon name="chevR" size={18} />
        </button>
        <Row id="treino" icon="dumbbell" title={t('Ficha de treino')} sub={t('{n} dias por semana', { n: p.workouts.length })} />
        <Row id="dieta" icon="food" title={t('Plano alimentar')} sub={t('{n} refeições por dia', { n: p.meals.length })} />
      </div>

      <div className="card menu-group">
        <span className="group-label ttl">
          {t('Conexões')}
          <Info text={t('Conecte sua agenda, seu Strava e o app da sua academia para o app cobrar com base neles.')} />
        </span>
        <Row id="integracoes" icon="calendar" title={t('Integrações')} sub={t('Agenda, Strava, Gympass e TotalPass')} />
      </div>

      <div className="card menu-group">
        <span className="group-label">{t('Ajuda')}</span>
        {onAdmin && (
          <button type="button" className="menu-row" onClick={onAdmin}>
            <span className="menu-ic">
              <Icon name="lock" size={20} />
            </span>
            <span>
              <b>{t('Painel admin')}</b>
              <small>{adminPending > 0 ? t('{n} solicitações esperando aprovação', { n: adminPending }) : t('Usuários, frequência e notificações')}</small>
            </span>
            {adminPending > 0 && <i className="cat-badge">{adminPending}</i>}
            <Icon name="chevR" size={18} />
          </button>
        )}
        <button type="button" className="menu-row" onClick={onRanking}>
          <span className="menu-ic">
            <Icon name="flame" size={20} />
          </span>
          <span>
            <b>{t('Ranking')}</b>
            <small>{t('Dispute pontos com seus amigos na semana')}</small>
          </span>
          <Icon name="chevR" size={18} />
        </button>
        <button type="button" className="menu-row" onClick={onConquistas}>
          <span className="menu-ic">
            <Icon name="star" size={20} />
          </span>
          <span>
            <b>{t('Conquistas')}</b>
            <small>{t('Seu nível, pontos e medalhas')}</small>
          </span>
          <Icon name="chevR" size={18} />
        </button>
        <button type="button" className="menu-row" onClick={onHow}>
          <span className="menu-ic">
            <Icon name="list" size={20} />
          </span>
          <span>
            <b>{t('Aulas do app')}</b>
            <small>{t('Reveja o passo a passo do app')}</small>
          </span>
          <Icon name="chevR" size={18} />
        </button>
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
        <label>
          {t('Seu momento')}
          <select id="pf-moment" value={p.moment || ''} onChange={(e) => upd({ moment: (e.target.value || undefined) as Profile['moment'] })}>
            <option value="">—</option>
            {(
              [
                ['nunca', 'Nunca treinei de verdade'],
                ['parei', 'Já treinei, mas parei'],
                ['desanimado', 'Estou desanimado'],
                ['treino', 'Já treino'],
              ] as const
            ).map(([v, l]) => (
              <option key={v} value={v}>
                {t(l)}
              </option>
            ))}
          </select>
          <small className="muted">{t('Muda o jeito que o treinador fala com você.')}</small>
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

function Rotina({ p, upd, extra }: { p: Profile; upd: Upd; extra: ReactNode }) {
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
      {extra}
    </form>
  )
}

function Treino({ p, upd, pdf }: { p: Profile; upd: Upd; pdf: ReactNode }) {
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
      <ModePick
        mode={p.trainMode}
        onChange={(m) => upd({ trainMode: m })}
        ficha={[t('Cadastrar minha ficha'), t('Enviar PDF/foto ou escrever os exercícios')]}
        check={[t('Não cadastrar'), t('Só marcar "treinei" quando fizer')]}
      />
      {p.trainMode === 'check' ? (
        <p className="lead">{t('Ligue os dias em que você treina. Nesses dias aparece "Treinei hoje" para você marcar.')}</p>
      ) : (
        <>
          {pdf}
          <p className="lead">{t('Ou escreva aqui: um exercício por linha. Dias desligados são descanso.')}</p>
        </>
      )}
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
            {w && p.trainMode !== 'check' && (
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

/** Escolha: cadastrar a ficha/dieta ou só marcar quando fizer. */
function ModePick({ mode, onChange, ficha, check }: { mode?: PlanMode; onChange: (m: PlanMode) => void; ficha: [string, string]; check: [string, string] }) {
  const cur = mode ?? 'ficha'
  return (
    <div className="mode-pick" role="radiogroup">
      {(
        [
          ['ficha', 'upload', ficha],
          ['check', 'check', check],
        ] as const
      ).map(([m, ic, [b, sm]]) => (
        <button key={m} type="button" role="radio" aria-checked={cur === m} className={`mode-opt ${cur === m ? 'on' : ''}`} onClick={() => onChange(m)}>
          <span className="mode-ic">
            <Icon name={ic} size={20} />
          </span>
          <b>{b}</b>
          <small>{sm}</small>
          <i className="mode-radio" />
        </button>
      ))}
    </div>
  )
}

function Dieta({ p, upd, pdf }: { p: Profile; upd: Upd; pdf: ReactNode }) {
  const set = (id: string, patch: Partial<Profile['meals'][number]>) => upd({ meals: p.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) })
  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <h1 className="ttl">
        {t('Plano alimentar')}
        <Info text={t('Suas refeições do dia com horário e o que comer. Cada uma vira uma tarefa na tela Hoje e uma cobrança.')} />
      </h1>
      <ModePick
        mode={p.dietMode}
        onChange={(m) => upd({ dietMode: m })}
        ficha={[t('Cadastrar minha dieta'), t('Enviar PDF/foto ou escrever as refeições')]}
        check={[t('Não cadastrar'), t('Só marcar "segui a dieta" no fim do dia')]}
      />
      {p.dietMode === 'check' ? (
        <div className="card mode-note">
          <Icon name="check" size={20} stroke={2.6} />
          <p>{t('Pronto. Todo dia aparece "Segui a dieta hoje" no Seu dia para você marcar. Quando quiser, cadastre a dieta para receber a cobrança de cada refeição.')}</p>
        </div>
      ) : (
        <>
          {pdf}
          <p className="lead">{t('Ou escreva aqui. Cada refeição vira uma notificação no horário.')}</p>
        </>
      )}
      {p.dietMode !== 'check' && p.meals
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
      {p.dietMode !== 'check' && (
        <button type="button" className="ghost-btn" onClick={() => upd({ meals: [...p.meals, { id: newId(), time: '10:00', name: t('Nova refeição'), items: '' }] })}>
          <Icon name="plus" size={18} /> {t('Adicionar refeição')}
        </button>
      )}
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

/** Sua conta: com quem está conectado, trocar senha e sair. Sem conta: convite para criar. */
function Account({ user, onLogout }: { user: User | null; onLogout?: () => void }) {
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (!user) return <LoginCta title={t('Você está sem conta')} text={t('Crie sua conta para salvar seus dados, entrar no ranking e receber as cobranças com o app fechado.')} />
  const via = user.provider === 'google' ? t('Entrou com Google') : user.provider === 'strava' ? t('Entrou com Strava') : t('Entrou com e-mail e senha')
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (next.length < 6) return setErr(t('A senha precisa ter pelo menos 6 caracteres'))
    if (next !== again) return setErr(t('As duas senhas novas não são iguais.'))
    setBusy(true)
    try {
      await api.changePassword(cur, next)
      toast(user.hasPassword ? t('Senha trocada') : t('Senha criada'), t('Use no próximo login.'))
      setOpen(false)
      setCur('')
      setNext('')
      setAgain('')
    } catch (x) {
      setErr(t((x as Error).message))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card account">
      <div className="account-h">
        <span className="account-ok">
          <Icon name="check" size={16} stroke={3} />
        </span>
        <span>
          <b>{t('Conectado como {n}', { n: user.name.split(' ')[0] })}</b>
          <small>
            {showEmail(user.email)} · {via}
          </small>
        </span>
      </div>
      {!open ? (
        <div className="account-actions">
          <button type="button" className="ghost-btn" onClick={() => setOpen(true)}>
            <Icon name="lock" size={16} /> {user.hasPassword ? t('Trocar senha') : t('Criar uma senha')}
          </button>
          {onLogout && (
            <button type="button" className="ghost-btn" onClick={onLogout}>
              <Icon name="logout" size={16} /> {t('Sair')}
            </button>
          )}
        </div>
      ) : (
        <form className="account-form" onSubmit={save}>
          {user.hasPassword && (
            <label>
              {t('Senha atual')}
              <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
            </label>
          )}
          <label>
            {t('Senha nova')}
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={6} required placeholder={t('Mínimo de 6 caracteres')} />
          </label>
          <label>
            {t('Repita a senha nova')}
            <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" minLength={6} required />
          </label>
          {err && <p className="form-err">{err}</p>}
          <div className="row2">
            <button type="button" className="ghost-btn" onClick={() => setOpen(false)}>
              {t('Cancelar')}
            </button>
            <button type="submit" className="cta" disabled={busy}>
              {t('Salvar senha')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
