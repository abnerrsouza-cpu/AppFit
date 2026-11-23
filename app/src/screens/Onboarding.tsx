import { useState } from 'react'
import { RoutineTasks } from '../components/RoutineTasks'
import { Icon } from '../components/Icon'
import { Info, WithInfo } from '../components/Info'
import { enableNotifications, notifyStatus } from '../notify'
import { toneLabel } from '../psych'
import { t } from '../i18n'
import { type AppState, type Profile, type Tone, resetToDemo, setState, today } from '../store'
import { LangPicker } from './Menu'
import { AvatarPicker } from '../components/AvatarPicker'

export function Onboarding({ p0, s, userId, hasServerAvatar }: { p0: Profile; s: AppState; userId?: number; hasServerAvatar?: boolean }) {
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Profile>(p0)
  const [signed, setSigned] = useState(false)
  const upd = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }))
  const total = 6

  const finish = () =>
    setState((st) => ({ ...st, demo: false, onboarded: true, profile: { ...p, avatarId: st.profile.avatarId, startDate: today() } }))

  const canNext = [true, !!p.name.trim() && p.height > 0 && p.weightStart > 0, true, true, signed && p.letter.trim().length > 10, true][step]

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
        <div className="onb-dots" aria-label={t('Passo {a} de {b}', { a: step + 1, b: total })}>
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        <span />
      </div>

      {step === 0 && (
        <div className="onb-body">
          <span className="brand-mark">
            <Icon name="flame" size={34} />
          </span>
          <h1 className="display">{t('Sem desculpa.')}</h1>
          <p className="lead">
            {t('Este app não é para te motivar. É para te cobrar. Todo dia. Até o fim do ciclo de {n} dias.', { n: p.cycleDays })}
          </p>
          <ul className="onb-list">
            <li>
              <Icon name="bell" size={18} /> {t('Notificações no horário de cada refeição e do treino')}
            </li>
            <li>
              <Icon name="list" size={18} /> {t('Prestação de contas obrigatória toda noite')}
            </li>
            <li>
              <Icon name="camera" size={18} /> {t('Foto semanal com antes e depois')}
            </li>
          </ul>
          <p className="muted">{t('Só funciona se você for honesto. Ninguém vê seus dados além de você.')}</p>
        </div>
      )}

      {step === 1 && (
        <div className="onb-body">
          <h1>
            {t('Quem está assumindo esse compromisso?')}
            <Info text={t('Seus dados básicos. O peso de hoje e a meta definem o seu caminho no app.')} />
          </h1>
          <div className="card field">
            <AvatarPicker big avatarId={s.profile.avatarId} userId={userId} hasServerAvatar={hasServerAvatar} name={p.name} />
            <label>
              {t('Seu nome')}
              <input id="ob-name" value={p.name} onChange={(e) => upd({ name: e.target.value })} autoFocus />
            </label>
            <label>
              {t('Objetivo')}
              <select id="ob-goal" value={p.goal} onChange={(e) => upd({ goal: e.target.value })}>
                {['Perder gordura', 'Perder gordura e ganhar definição', 'Ganhar massa', 'Manter e ter constância'].map((g) => (
                  <option key={g} value={g}>{t(g)}</option>
                ))}
              </select>
            </label>
            <div className="row2">
              <label>
                {t('Altura (cm)')}
                <input id="ob-h" type="number" inputMode="numeric" value={p.height} onChange={(e) => upd({ height: Number(e.target.value) })} />
              </label>
              <label>
                {t('Idade')}
                <input id="ob-age" type="number" inputMode="numeric" value={p.age} onChange={(e) => upd({ age: Number(e.target.value) })} />
              </label>
            </div>
            <div className="row2">
              <label>
                {t('Peso hoje (kg)')}
                <input id="ob-w" type="number" step={0.1} inputMode="decimal" value={p.weightStart} onChange={(e) => upd({ weightStart: Number(e.target.value) })} />
              </label>
              <label>
                {t('Meta (kg)')}
                <input id="ob-wg" type="number" step={0.1} inputMode="decimal" value={p.weightGoal} onChange={(e) => upd({ weightGoal: Number(e.target.value) })} />
              </label>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
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
          <p className="muted">{t('Ficha de treino, plano alimentar e Google Agenda você cadastra depois, no Perfil.')}</p>
        </div>
      )}

      {step === 3 && (
        <div className="onb-body">
          <h1>
            {t('Quão duro eu posso ser?')}
            <Info text={t('O tom das mensagens do treinador. Dá para trocar depois, no sino da tela Hoje.')} />
          </h1>
          <p className="lead">{t('Dá para mudar depois. A maioria escolhe Treinador.')}</p>
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

      {step === 4 && (
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

      {step === 5 && <NotifStep />}

      <div className="onb-foot">
        {step < total - 1 ? (
          <WithInfo text={step === 0 ? t('Começa o cadastro. São 6 passos rápidos.') : t('Vai para o próximo passo do cadastro.')}>
            <button type="button" className="cta" disabled={!canNext} onClick={() => setStep(step + 1)}>
              {step === 0 ? t('Aceito ser cobrado') : t('Continuar')}
            </button>
          </WithInfo>
        ) : (
          <WithInfo text={t('Termina o cadastro e abre a tela Hoje. A contagem dos dias começa agora.')}>
            <button type="button" className="cta" onClick={finish}>
              {t('Começar o dia 1')}
            </button>
          </WithInfo>
        )}
        {step === 0 && (
          <button type="button" className="link center" onClick={resetToDemo}>
            {t('Ver com dados de exemplo')}
          </button>
        )}
        {step === 0 && <LangPicker s={s} />}
      </div>
    </div>
  )
}

function NotifStep() {
  const [st, setSt] = useState(notifyStatus())
  return (
    <div className="onb-body">
      <h1>
        {t('Me deixa te cobrar fora do app')}
        <Info text={t('Instale o app na tela de início e ative as notificações para receber as cobranças no celular.')} />
      </h1>
      <p className="lead">{t('Sem notificação, eu sou só mais um app esquecido na tela.')}</p>
      <div className="card field">
        <ol className="steps">
          <li>
            <b>iPhone:</b> {t('no Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início". Abra pelo ícone.')}
          </li>
          <li>
            <b>Android:</b> {t('no Chrome, toque em "Instalar app".')}
          </li>
          <li>{t('Depois, ative as notificações abaixo.')}</li>
        </ol>
        {st === 'granted' ? (
          <p className="ok-line">
            <Icon name="check" size={18} stroke={3} /> {t('Notificações ativadas')}
          </p>
        ) : st === 'default' ? (
          <button type="button" className="ghost-btn" onClick={async () => setSt(await enableNotifications())}>
            <Icon name="bell" size={18} /> {t('Ativar notificações')}
          </button>
        ) : (
          <p className="muted">{t('Instale o app primeiro e ative depois no sininho da tela Hoje.')}</p>
        )}
      </div>
    </div>
  )
}
