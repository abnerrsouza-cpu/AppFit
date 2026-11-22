import { useState } from 'react'
import { Icon } from '../components/Icon'
import { enableNotifications, notifyStatus, show } from '../notify'
import { dailySchedule, toneLabel } from '../psych'
import { type AppState, type Tone, setState } from '../store'

const TONE_EMOJI: Record<Tone, string> = { parceiro: '🤝', treinador: '📣', sargento: '🪖' }

export function Alerts({ s, onBack }: { s: AppState; onBack: () => void }) {
  const [status, setStatus] = useState(notifyStatus())
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const list = dailySchedule(s)
  const past = list.filter((n) => n.time <= hhmm)
  const next = list.find((n) => n.time > hhmm)

  return (
    <div className="screen">
      <header className="chat-h">
        <button type="button" className="round-btn" onClick={onBack} aria-label="Voltar">
          <Icon name="back" />
        </button>
        <span className="coach-av lg">
          <Icon name="flame" size={26} />
        </span>
        <div>
          <b>Seu treinador</b>
          <small>
            {TONE_EMOJI[s.profile.tone]} modo {toneLabel[s.profile.tone].name.toLowerCase()}
          </small>
        </div>
      </header>

      <div className="tone-pick">
        {(Object.keys(toneLabel) as Tone[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`tone tone-${t} ${s.profile.tone === t ? 'on' : ''}`}
            onClick={() => setState((st) => ({ ...st, profile: { ...st.profile, tone: t } }))}
          >
            <span className="tone-emo">{TONE_EMOJI[t]}</span>
            <b>{toneLabel[t].name}</b>
          </button>
        ))}
      </div>

      {status !== 'granted' && (
        <section className="card notif">
          <span className="notif-ic">
            <Icon name="bell" />
          </span>
          <div>
            <b>Deixe eu te cobrar fora do app</b>
            <small>
              {status === 'default' && 'Ative as notificações.'}
              {status === 'denied' && 'Você bloqueou. Libere nas configurações do navegador.'}
              {status === 'needs-install' && 'No iPhone: Compartilhar e depois "Adicionar à Tela de Início".'}
              {status === 'unsupported' && 'Instale o app no celular para ativar.'}
            </small>
          </div>
          {status === 'default' && (
            <button type="button" className="pill-btn sm" onClick={async () => setStatus(await enableNotifications())}>
              Ativar
            </button>
          )}
        </section>
      )}

      <div className="chat">
        <span className="chat-day">Hoje</span>
        {past.length === 0 && <p className="muted center-txt">Ainda tá cedo. A primeira mensagem sai às {list[0]?.time}.</p>}
        {past.map((n) => (
          <div key={n.moment + n.time} className={`msg ${n.moment === 'checkin_atrasado' ? 'hot' : ''}`}>
            <p>{n.body}</p>
            <small>{n.time}</small>
          </div>
        ))}
        {next && (
          <div className="msg typing">
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
            <small>próxima às {next.time}</small>
          </div>
        )}
      </div>

      {status === 'granted' && (
        <button type="button" className="ghost-btn" onClick={() => show(next?.title ?? 'Teste', next?.body ?? 'Funcionando.')}>
          <Icon name="bell" size={18} /> Testar notificação
        </button>
      )}
    </div>
  )
}
