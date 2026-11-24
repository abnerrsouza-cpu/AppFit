import { useState } from 'react'
import { RoutineTasks } from '../components/RoutineTasks'
import { Icon } from '../components/Icon'
import { Info } from '../components/Info'
import { isStandalone, notifyStatus } from '../notify'
import { InstallStep, NotifyStep } from '../components/InstallGuide'
import { FirstPhotos } from '../components/FirstPhotos'
import { toneLabel } from '../psych'
import { t, weekday } from '../i18n'
import { type AppState, type Moment, type Profile, type Tone, getProjeto, resetToDemo, setState, today } from '../store'
import { PdfImport } from '../components/PdfImport'
import { LangPicker } from './Menu'
import { AvatarPicker } from '../components/AvatarPicker'

type StepId = 'welcome' | 'name' | 'moment' | 'goal' | 'body' | 'routine' | 'train' | 'diet' | 'cardio' | 'tone' | 'letter' | 'photos' | 'notif'
const STEPS: StepId[] = ['welcome', 'name', 'moment', 'goal', 'body', 'routine', 'train', 'diet', 'cardio', 'tone', 'letter', 'photos', 'notif']

const MOMENTS: { id: Moment; icon: string; title: string; sub: string; reply: string }[] = [
  { id: 'nunca', icon: 'star', title: 'Nunca treinei de verdade', sub: 'Quero começar do zero', reply: 'Perfeito. A gente vai no passo a passo: primeiro criar o hábito, depois o resto.' },
  { id: 'parei', icon: 'back', title: 'Já treinei, mas parei', sub: 'Quero voltar e não parar mais', reply: 'Você já sabe o caminho. O desafio agora é não parar de novo, e é aí que eu entro.' },
  { id: 'desanimado', icon: 'bed', title: 'Estou desanimado', sub: 'Sem vontade, preciso de um empurrão', reply: 'Tudo bem. Ninguém precisa de motivação para dar o primeiro passo. A gente começa pequeno: 5 minutos de cada vez.' },
  { id: 'treino', icon: 'dumbbell', title: 'Já treino', sub: 'Quero levar a sério e chegar no resultado', reply: 'Então aqui vai ser à risca. Projeto montado, metas com prazo e cobrança de verdade.' },
]
const GOALS = [
  { id: 'Perder gordura', icon: 'flame' },
  { id: 'Perder gordura e ganhar definição', icon: 'target' },
  { id: 'Ganhar massa', icon: 'dumbbell' },
  { id: 'Manter e ter constância', icon: 'check' },
]
const CARDIO = [0, 60, 90, 150, 210]
const WD = [1, 2, 3, 4, 5, 6, 0]

export function Onboarding({ p0, s, userId, hasServerAvatar }: { p0: Profile; s: AppState; userId?: number; hasServerAvatar?: boolean }) {
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Profile>(p0)
  const [signed, setSigned] = useState(false)
  const upd = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }))
  const total = STEPS.length
  const id = STEPS[step]
  const first = p.name.trim().split(' ')[0]

  const finish = () =>
    setState((st) => ({ ...st, demo: false, onboarded: true, profile: { ...p, avatarId: st.profile.avatarId, startDate: today() }, photosAsked: true, seenHow: false, firstRun: 'aulas' }))

  const canNext: Record<StepId, boolean> = {
    welcome: true,
    name: !!p.name.trim(),
    moment: !!p.moment,
    goal: !!p.goal,
    body: p.height > 0 && p.weightStart > 0 && p.weightGoal > 0,
    routine: true,
    train: !!p.trainMode && p.workouts.length > 0,
    diet: !!p.dietMode,
    cardio: true,
    tone: true,
    letter: signed && p.letter.trim().length > 10,
    photos: true,
    notif: true,
  }
  const toggleDay = (wd: number) => {
    const has = p.workouts.some((w) => w.weekday === wd)
    upd({ workouts: has ? p.workouts.filter((w) => w.weekday !== wd) : [...p.workouts, { weekday: wd, title: t('Treino'), items: '' }].sort((a, b) => a.weekday - b.weekday) })
  }
  const days = (
    <div className="ob-days">
      <span className="ob-q">{t('Em quais dias você vai treinar?')}</span>
      <div className="chips">
        {WD.map((wd) => (
          <button key={wd} type="button" className={`chip ${p.workouts.some((w) => w.weekday === wd) ? 'on' : ''}`} onClick={() => toggleDay(wd)}>
            {weekday(wd).slice(0, 3)}
          </button>
        ))}
      </div>
      <small className="muted">{p.workouts.length === 1 ? t('1 dia por semana') : t('{n} dias por semana', { n: p.workouts.length })}</small>
    </div>
  )
  const moment = MOMENTS.find((m) => m.id === p.moment)

  return (
    <div className="onb">
      <div className="onb-top">
        {step > 0 ? (
          <button type="button" className="round-btn" onClick={() => setStep(step - 1)} aria-label={t('Voltar')}>
            <Icon name="back" />
          </button>
        ) : (
          <span />
        )}
        <div className="ob-prog" aria-label={t('Passo {a} de {b}', { a: step + 1, b: total })}>
          <span style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <small className="ob-count">
          {step + 1}/{total}
        </small>
      </div>

      {id === 'welcome' && (
        <div className="onb-body">
          <span className="brand-mark">
            <Icon name="flame" size={34} />
          </span>
          <h1 className="display">{t('Sem desculpa.')}</h1>
          <p className="lead">{t('Este app não é para te motivar. É para te cobrar. Todo dia. Até o fim do ciclo de {n} dias.', { n: p.cycleDays })}</p>
          <ol className="ob-path">
            <li>
              <b>1</b> {t('Você responde algumas perguntas (3 minutos)')}
            </li>
            <li>
              <b>2</b> {t('Aprende a usar o app em aulas rápidas')}
            </li>
            <li>
              <b>3</b> {t('Monta o seu projetinho')}
            </li>
            <li>
              <b>4</b> {t('E marca o seu primeiro treino')}
            </li>
          </ol>
          <p className="muted">{t('Só funciona se você for honesto. Ninguém vê seus dados além de você.')}</p>
        </div>
      )}

      {id === 'name' && (
        <div className="onb-body">
          <h1>{t('Primeiro: como você se chama?')}</h1>
          <div className="card field">
            <AvatarPicker big avatarId={s.profile.avatarId} userId={userId} hasServerAvatar={hasServerAvatar} name={p.name} />
            <label>
              {t('Seu nome')}
              <input id="ob-name" value={p.name} onChange={(e) => upd({ name: e.target.value })} autoFocus />
            </label>
          </div>
        </div>
      )}

      {id === 'moment' && (
        <div className="onb-body">
          <h1>{t('{n}, em que momento você está?', { n: first || t('Ei') })}</h1>
          <p className="lead">{t('Seja sincero. É isso que define como eu vou falar com você.')}</p>
          <div className="ob-opts">
            {MOMENTS.map((m) => (
              <button key={m.id} type="button" className={`ob-opt ${p.moment === m.id ? 'on' : ''}`} onClick={() => upd({ moment: m.id })}>
                <span className="ob-opt-ic">
                  <Icon name={m.icon} size={20} />
                </span>
                <span>
                  <b>{t(m.title)}</b>
                  <small>{t(m.sub)}</small>
                </span>
              </button>
            ))}
          </div>
          {moment && (
            <div className="coach ob-reply">
              <span className="coach-av">
                <Icon name="flame" size={18} />
              </span>
              <span className="coach-bubble">{t(moment.reply)}</span>
            </div>
          )}
        </div>
      )}

      {id === 'goal' && (
        <div className="onb-body">
          <h1>{t('Qual é o seu objetivo?')}</h1>
          <div className="ob-opts">
            {GOALS.map((g) => (
              <button key={g.id} type="button" className={`ob-opt ${p.goal === g.id ? 'on' : ''}`} onClick={() => upd({ goal: g.id })}>
                <span className="ob-opt-ic">
                  <Icon name={g.icon} size={20} />
                </span>
                <span>
                  <b>{t(g.id)}</b>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {id === 'body' && (
        <div className="onb-body">
          <h1>
            {t('Seus números de hoje')}
            <Info text={t('O peso de hoje e a meta definem o seu caminho e a previsão de quando você chega lá.')} />
          </h1>
          <p className="lead">{t('Sem vergonha: ninguém vê além de você.')}</p>
          <div className="card field">
            <div className="row2">
              <label>
                {t('Altura (cm)')}
                <input id="ob-h" type="number" inputMode="numeric" value={p.height || ''} onChange={(e) => upd({ height: Number(e.target.value) })} />
              </label>
              <label>
                {t('Idade')}
                <input id="ob-age" type="number" inputMode="numeric" value={p.age || ''} onChange={(e) => upd({ age: Number(e.target.value) })} />
              </label>
            </div>
            <div className="row2">
              <label>
                {t('Peso hoje (kg)')}
                <input id="ob-w" type="number" step={0.1} inputMode="decimal" value={p.weightStart || ''} onChange={(e) => upd({ weightStart: Number(e.target.value) })} />
              </label>
              <label>
                {t('Meta (kg)')}
                <input id="ob-wg" type="number" step={0.1} inputMode="decimal" value={p.weightGoal || ''} onChange={(e) => upd({ weightGoal: Number(e.target.value) })} />
              </label>
            </div>
            {p.weightStart > 0 && p.weightGoal > 0 && p.weightStart !== p.weightGoal && (
              <small className="ob-hint">
                {p.weightStart > p.weightGoal ? t('{n} kg a perder.', { n: Math.round((p.weightStart - p.weightGoal) * 10) / 10 }) : t('{n} kg a ganhar.', { n: Math.round((p.weightGoal - p.weightStart) * 10) / 10 })}{' '}
                {t('Cumprindo tudo, dá para chegar em cerca de {w} semanas.', {
                  w: Math.max(1, Math.ceil(Math.abs(p.weightStart - p.weightGoal) / (p.weightStart > p.weightGoal ? Math.min(1, Math.max(0.5, p.weightStart * 0.0085)) : 0.25))),
                })}
              </small>
            )}
          </div>
        </div>
      )}

      {id === 'routine' && (
        <div className="onb-body">
          <h1>
            {t('Sua rotina')}
            <Info text={t('Os horários em que você acorda, treina, presta contas e dorme. As cobranças chegam nesses horários.')} />
          </h1>
          <p className="lead">{t('É nesses horários que eu vou aparecer.')}</p>
          <div className="card field">
            <div className="row2">
              <label>
                {t('Acordar')}
                <input id="ob-wake" type="time" value={p.wake} onChange={(e) => upd({ wake: e.target.value })} />
              </label>
              <label>
                {t('Treino')}
                <input id="ob-train" type="time" value={p.trainTime} onChange={(e) => upd({ trainTime: e.target.value })} />
              </label>
            </div>
            <div className="row2">
              <label>
                {t('Prestar contas')}
                <input id="ob-ci" type="time" value={p.checkinTime} onChange={(e) => upd({ checkinTime: e.target.value })} />
              </label>
              <label>
                {t('Dormir')}
                <input id="ob-sleep" type="time" value={p.sleep} onChange={(e) => upd({ sleep: e.target.value })} />
              </label>
            </div>
          </div>
          <RoutineTasks tasks={p.tasks} upd={upd} online={!!userId} lang={s.lang || 'pt'} />
        </div>
      )}

      {id === 'train' && (
        <div className="onb-body">
          <h1>{t('Você tem ficha de treino?')}</h1>
          <p className="lead">{t('Do personal, da academia ou que você mesmo montou.')}</p>
          <div className="ob-opts">
            <button type="button" className={`ob-opt ${p.trainMode === 'ficha' ? 'on' : ''}`} onClick={() => upd({ trainMode: 'ficha' })}>
              <span className="ob-opt-ic">
                <Icon name="upload" size={20} />
              </span>
              <span>
                <b>{t('Tenho ficha')}</b>
                <small>{t('Envio PDF ou foto agora (ou escrevo depois)')}</small>
              </span>
            </button>
            <button type="button" className={`ob-opt ${p.trainMode === 'check' ? 'on' : ''}`} onClick={() => upd({ trainMode: 'check' })}>
              <span className="ob-opt-ic">
                <Icon name="check" size={20} />
              </span>
              <span>
                <b>{t('Não tenho ficha')}</b>
                <small>{t('Só quero marcar "treinei" quando treinar')}</small>
              </span>
            </button>
          </div>
          {p.trainMode === 'ficha' && <PdfImport kind="workout" online={!!userId} lang={s.lang || 'pt'} upd={upd} files={p.trainFiles} />}
          {p.trainMode && days}
        </div>
      )}

      {id === 'diet' && (
        <div className="onb-body">
          <h1>{t('E dieta, você tem?')}</h1>
          <p className="lead">{t('Do nutricionista ou um plano que você segue.')}</p>
          <div className="ob-opts">
            <button type="button" className={`ob-opt ${p.dietMode === 'ficha' ? 'on' : ''}`} onClick={() => upd({ dietMode: 'ficha' })}>
              <span className="ob-opt-ic">
                <Icon name="upload" size={20} />
              </span>
              <span>
                <b>{t('Tenho dieta')}</b>
                <small>{t('Envio PDF ou foto agora (ou escrevo depois)')}</small>
              </span>
            </button>
            <button type="button" className={`ob-opt ${p.dietMode === 'check' ? 'on' : ''}`} onClick={() => upd({ dietMode: 'check' })}>
              <span className="ob-opt-ic">
                <Icon name="check" size={20} />
              </span>
              <span>
                <b>{t('Não tenho dieta')}</b>
                <small>{t('Só quero marcar se segui a dieta no fim do dia')}</small>
              </span>
            </button>
          </div>
          {p.dietMode === 'ficha' && <PdfImport kind="diet" online={!!userId} lang={s.lang || 'pt'} upd={upd} files={p.dietFiles} />}
        </div>
      )}

      {id === 'cardio' && (
        <div className="onb-body">
          <h1>{t('Quanto cardio por semana?')}</h1>
          <p className="lead">{t('Esteira, bike, caminhada, corrida. Eu divido pelos dias e te cobro.')}</p>
          <div className="ob-opts">
            {CARDIO.map((m) => (
              <button key={m} type="button" className={`ob-opt ${p.cardioGoalMin === m ? 'on' : ''}`} onClick={() => upd({ cardioGoalMin: m })}>
                <span className="ob-opt-ic">
                  <Icon name="run" size={20} />
                </span>
                <span>
                  <b>{m === 0 ? t('Sem cardio por enquanto') : t('{n} min por semana', { n: m })}</b>
                  {m > 0 && <small>{t('Cerca de {n} min por dia, 5 dias', { n: Math.round(m / 5) })}</small>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {id === 'tone' && (
        <div className="onb-body">
          <h1>
            {t('Quão duro eu posso ser?')}
            <Info text={t('O tom das mensagens do treinador. Dá para trocar depois, no sino da tela Hoje.')} />
          </h1>
          <p className="lead">{p.moment === 'desanimado' || p.moment === 'nunca' ? t('Para começar, a maioria escolhe Parceiro. Dá para mudar depois.') : t('Dá para mudar depois. A maioria escolhe Treinador.')}</p>
          <div className="tone-pick col">
            {(Object.keys(toneLabel()) as Tone[]).map((tn) => (
              <button key={tn} type="button" aria-pressed={p.tone === tn} className={`tone tone-${tn} ${p.tone === tn ? 'on' : ''}`} onClick={() => upd({ tone: tn })}>
                <b>{toneLabel()[tn].name}</b>
                <small>{toneLabel()[tn].desc}</small>
                <em>
                  {t(
                    {
                      parceiro: '"Dia difícil. Acontece, mas não vira hábito."',
                      treinador: '"Meio-termo não muda corpo nenhum."',
                      sargento: '"Hoje foi dinheiro jogado fora."',
                    }[tn]
                  )}
                </em>
              </button>
            ))}
          </div>
        </div>
      )}

      {id === 'letter' && (
        <div className="onb-body">
          <h1>
            {t('Carta para o seu eu de daqui a {n} dias', { n: p.cycleDays })}
            <Info text={t('Escreva por que você está começando. Nos dias em que quiser desistir, o app mostra essa carta.')} />
          </h1>
          <p className="lead">{t('Por que você começou? O que você não aguenta mais? Nos dias em que você quiser desistir, eu vou te mostrar isso aqui.')}</p>
          <div className="card field">
            <textarea id="ob-letter" rows={7} value={p.letter} onChange={(e) => upd({ letter: e.target.value })} placeholder={t('Cansei de...')} />
          </div>
          <label className={`card honest ${signed ? 'on' : ''}`}>
            <input id="ob-sign" type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
            <span className={`tick ${signed ? 'emoji' : ''}`}>{signed ? '✅' : ''}</span>
            <span>
              <b>{t('Eu, {nome}, me comprometo a prestar contas todos os dias, com a verdade.', { nome: p.name || '...' })}</b>
              <small>{t('Assinado em {d}', { d: new Date().toLocaleDateString() })}</small>
            </span>
          </label>
        </div>
      )}

      {id === 'photos' && <FirstPhotos s={s} embedded profile={p} />}
      {id === 'notif' && <NotifStep />}

      <div className="onb-foot">
        {step < total - 1 ? (
          <button type="button" className="cta" disabled={!canNext[id]} onClick={() => setStep(step + 1)}>
            {id === 'welcome' ? t('Aceito ser cobrado') : id === 'photos' && !(s.startPhotoId && getProjeto(s).vision.photoId) ? t('Continuar sem as fotos') : t('Continuar')}
          </button>
        ) : (
          <button type="button" className="cta" onClick={finish}>
            {t('Começar as aulas do app')}
          </button>
        )}
        {id === 'welcome' && (
          <button type="button" className="link center" onClick={resetToDemo}>
            {t('Ver com dados de exemplo')}
          </button>
        )}
        {id === 'welcome' && <LangPicker s={s} />}
      </div>
    </div>
  )
}

function NotifStep() {
  const installed = isStandalone()
  return (
    <div className="onb-body">
      <h1>
        {t('Me deixa te cobrar fora do app')}
        <Info text={t('Instale o app na tela de início e ative as notificações para receber as cobranças no celular.')} />
      </h1>
      <p className="lead">{t('Sem notificação, eu sou só mais um app esquecido na tela.')}</p>
      <ol className="timeline card">
        <li className={`tl-step ${installed ? 'done' : 'now'}`}>
          <span className="tl-dot">{installed ? <Icon name="check" size={14} stroke={3} /> : 1}</span>
          <div className="tl-body">
            <b>{t('Coloque o app na tela de início do celular')}</b>
            <InstallStep />
          </div>
        </li>
        <li className={`tl-step ${notifyStatus() === 'granted' ? 'done' : installed ? 'now' : 'todo'}`}>
          <span className="tl-dot">{notifyStatus() === 'granted' ? <Icon name="check" size={14} stroke={3} /> : 2}</span>
          <div className="tl-body">
            <b>{t('Ative os avisos')}</b>
            <NotifyStep okText={t('Avisos ativados. As cobranças vão chegar no seu celular.')} />
          </div>
        </li>
      </ol>
      {!installed && <p className="muted">{t('Pode continuar agora e fazer isso depois: o app lembra você na tela Hoje.')}</p>}
    </div>
  )
}
