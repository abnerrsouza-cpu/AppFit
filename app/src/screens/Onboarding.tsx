import { useState } from 'react'
import { Icon } from '../components/Icon'
import { enableNotifications, notifyStatus } from '../notify'
import { toneLabel } from '../psych'
import { type Profile, type Tone, resetToDemo, setState, today } from '../store'

export function Onboarding({ p0 }: { p0: Profile }) {
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Profile>(p0)
  const [signed, setSigned] = useState(false)
  const upd = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }))
  const total = 6

  const finish = () =>
    setState((st) => ({ ...st, demo: false, onboarded: true, profile: { ...p, startDate: today() } }))

  const canNext = [true, !!p.name.trim() && p.height > 0 && p.weightStart > 0, true, true, signed && p.letter.trim().length > 10, true][step]

  return (
    <div className="onb">
      <div className="onb-top">
        {step > 0 ? (
          <button type="button" className="round-btn" onClick={() => setStep(step - 1)} aria-label="Voltar">
            <Icon name="back" />
          </button>
        ) : (
          <span />
        )}
        <div className="onb-dots" aria-label={`Passo ${step + 1} de ${total}`}>
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
          <h1 className="display">Sem desculpa.</h1>
          <p className="lead">
            Este app não é para te motivar. É para te <b>cobrar</b>. Todo dia. Até o fim do ciclo de {p.cycleDays} dias.
          </p>
          <ul className="onb-list">
            <li>
              <Icon name="bell" size={18} /> Notificações no horário de cada refeição e do treino
            </li>
            <li>
              <Icon name="list" size={18} /> Prestação de contas obrigatória toda noite
            </li>
            <li>
              <Icon name="camera" size={18} /> Foto semanal com antes e depois
            </li>
          </ul>
          <p className="muted">Só funciona se você for honesto. Ninguém vê seus dados além de você.</p>
        </div>
      )}

      {step === 1 && (
        <div className="onb-body">
          <h1>Quem está assumindo esse compromisso?</h1>
          <div className="card field">
            <label>
              Seu nome
              <input id="ob-name" value={p.name} onChange={(e) => upd({ name: e.target.value })} autoFocus />
            </label>
            <label>
              Objetivo
              <select id="ob-goal" value={p.goal} onChange={(e) => upd({ goal: e.target.value })}>
                {['Perder gordura', 'Perder gordura e ganhar definição', 'Ganhar massa', 'Manter e ter constância'].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <div className="row2">
              <label>
                Altura (cm)
                <input id="ob-h" type="number" inputMode="numeric" value={p.height} onChange={(e) => upd({ height: Number(e.target.value) })} />
              </label>
              <label>
                Idade
                <input id="ob-age" type="number" inputMode="numeric" value={p.age} onChange={(e) => upd({ age: Number(e.target.value) })} />
              </label>
            </div>
            <div className="row2">
              <label>
                Peso hoje (kg)
                <input id="ob-w" type="number" step={0.1} inputMode="decimal" value={p.weightStart} onChange={(e) => upd({ weightStart: Number(e.target.value) })} />
              </label>
              <label>
                Meta (kg)
                <input id="ob-wg" type="number" step={0.1} inputMode="decimal" value={p.weightGoal} onChange={(e) => upd({ weightGoal: Number(e.target.value) })} />
              </label>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="onb-body">
          <h1>Sua rotina</h1>
          <p className="lead">É nesses horários que eu vou aparecer.</p>
          <div className="card field">
            <div className="row2">
              <label>
                Acordar
                <input id="ob-wake" type="time" value={p.wake} onChange={(e) => upd({ wake: e.target.value })} />
              </label>
              <label>
                Treino
                <input id="ob-train" type="time" value={p.trainTime} onChange={(e) => upd({ trainTime: e.target.value })} />
              </label>
            </div>
            <div className="row2">
              <label>
                Prestar contas
                <input id="ob-ci" type="time" value={p.checkinTime} onChange={(e) => upd({ checkinTime: e.target.value })} />
              </label>
              <label>
                Dormir
                <input id="ob-sleep" type="time" value={p.sleep} onChange={(e) => upd({ sleep: e.target.value })} />
              </label>
            </div>
          </div>
          <p className="muted">Ficha de treino, plano alimentar e Google Agenda você cadastra depois, no Menu.</p>
        </div>
      )}

      {step === 3 && (
        <div className="onb-body">
          <h1>Quão duro eu posso ser?</h1>
          <p className="lead">Dá para mudar depois. A maioria escolhe Treinador.</p>
          <div className="tone-pick col">
            {(Object.keys(toneLabel) as Tone[]).map((t) => (
              <button key={t} type="button" className={`tone tone-${t} ${p.tone === t ? 'on' : ''}`} onClick={() => upd({ tone: t })}>
                <b>{toneLabel[t].name}</b>
                <small>{toneLabel[t].desc}</small>
                <em>
                  {
                    {
                      parceiro: '"Dia difícil. Acontece, mas não vira hábito."',
                      treinador: '"Meio-termo não muda corpo nenhum."',
                      sargento: '"Hoje foi dinheiro jogado fora."',
                    }[t]
                  }
                </em>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="onb-body">
          <h1>Carta para o seu eu de daqui a {p.cycleDays} dias</h1>
          <p className="lead">Por que você começou? O que você não aguenta mais? Nos dias em que você quiser desistir, eu vou te mostrar isso aqui.</p>
          <div className="card field">
            <textarea id="ob-letter" rows={7} value={p.letter} onChange={(e) => upd({ letter: e.target.value })} placeholder="Cansei de..." />
          </div>
          <label className={`card honest ${signed ? 'on' : ''}`}>
            <input id="ob-sign" type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
            <span className="tick">{signed && <Icon name="check" size={16} stroke={3} />}</span>
            <span>
              <b>Eu, {p.name || '...'}, me comprometo a prestar contas todos os dias, com a verdade.</b>
              <small>Assinado em {new Date().toLocaleDateString('pt-BR')}</small>
            </span>
          </label>
        </div>
      )}

      {step === 5 && <NotifStep />}

      <div className="onb-foot">
        {step < total - 1 ? (
          <button type="button" className="cta" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {step === 0 ? 'Aceito ser cobrado' : 'Continuar'}
          </button>
        ) : (
          <button type="button" className="cta" onClick={finish}>
            Começar o dia 1
          </button>
        )}
        {step === 0 && (
          <button type="button" className="link center" onClick={resetToDemo}>
            Ver com dados de exemplo
          </button>
        )}
      </div>
    </div>
  )
}

function NotifStep() {
  const [st, setSt] = useState(notifyStatus())
  return (
    <div className="onb-body">
      <h1>Me deixa te cobrar fora do app</h1>
      <p className="lead">Sem notificação, eu sou só mais um app esquecido na tela.</p>
      <div className="card field">
        <ol className="steps">
          <li>
            <b>iPhone:</b> no Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início". Abra pelo ícone.
          </li>
          <li>
            <b>Android:</b> no Chrome, toque em "Instalar app".
          </li>
          <li>Depois, ative as notificações abaixo.</li>
        </ol>
        {st === 'granted' ? (
          <p className="ok-line">
            <Icon name="check" size={18} stroke={3} /> Notificações ativadas
          </p>
        ) : st === 'default' ? (
          <button type="button" className="ghost-btn" onClick={async () => setSt(await enableNotifications())}>
            <Icon name="bell" size={18} /> Ativar notificações
          </button>
        ) : (
          <p className="muted">Instale o app primeiro e ative depois na aba Cobranças.</p>
        )}
      </div>
    </div>
  )
}
