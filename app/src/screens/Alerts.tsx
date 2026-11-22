import { useState } from 'react'
import { Icon } from '../components/Icon'
import { enableNotifications, fireTestNow, notifyStatus, show } from '../notify'
import { dailySchedule, toneLabel } from '../psych'
import { type AppState, type CustomNudge, type Tone, defaultCustom, newId, setState } from '../store'

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

      <section className={`card test-mode ${s.testEvery ? 'on' : ''}`}>
        <div>
          <b>🧪 Modo teste: a cada 5 min</b>
          <small>{s.testEvery ? 'Ligado. Deixe o app aberto para receber.' : 'Para ver as cobranças chegando. Funciona com o app aberto.'}</small>
        </div>
        <button
          type="button"
          className={`switch ${s.testEvery ? 'on' : ''}`}
          aria-pressed={!!s.testEvery}
          aria-label="Modo teste a cada 5 minutos"
          disabled={status !== 'granted'}
          onClick={() => {
            const on = !s.testEvery
            setState((st) => ({ ...st, testEvery: on ? 5 : 0 }))
            if (on) void fireTestNow()
          }}
        >
          <i />
        </button>
      </section>

      <MyNudges s={s} canSend={status === 'granted'} />
    </div>
  )
}

function MyNudges({ s, canSend }: { s: AppState; canSend: boolean }) {
  const list = s.custom ?? defaultCustom()
  const [text, setText] = useState('')
  const [time, setTime] = useState('19:00')
  const [sent, setSent] = useState<string | null>(null)
  const save = (l: CustomNudge[]) => setState((st) => ({ ...st, custom: l }))

  const send = async (n: CustomNudge) => {
    const ok = await show('Recado seu', n.text)
    setSent(ok ? n.id : 'erro')
    setTimeout(() => setSent(null), 2500)
  }

  return (
    <section className="card block mine">
      <div className="block-h">
        <h2>Suas cobranças</h2>
        <span className="soft-chip">todo dia</span>
      </div>
      <p className="hint">Escreva do seu jeito. Elas chegam como notificação no horário.</p>
      <ul className="mine-list">
        {list.map((n) => (
          <li key={n.id} className={n.on ? '' : 'off'}>
            <input
              id={`cn-t-${n.id}`}
              type="time"
              value={n.time}
              onChange={(e) => save(list.map((x) => (x.id === n.id ? { ...x, time: e.target.value } : x)))}
              aria-label="Horário"
            />
            <span className="mine-text">{n.text}</span>
            <button type="button" className="mine-send" onClick={() => send(n)} disabled={!canSend} aria-label="Enviar agora">
              {sent === n.id ? <Icon name="check" size={16} stroke={3} /> : <Icon name="play" size={14} />}
            </button>
            <button type="button" className="mine-del" onClick={() => save(list.filter((x) => x.id !== n.id))} aria-label="Apagar">
              <Icon name="x" size={14} stroke={2.5} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mine-add"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          save([...list, { id: newId(), time, text: text.trim(), on: true }])
          setText('')
        }}
      >
        <input id="cn-new-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Horário" />
        <input id="cn-new-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: Larga o celular e vai treinar" />
        <button type="submit" className="mine-plus" aria-label="Adicionar">
          <Icon name="plus" size={18} stroke={2.5} />
        </button>
      </form>
      {canSend ? (
        <button type="button" className="cta" onClick={() => send(list[0] ?? { id: 'x', time: '', text: 'Treinou hoje? Bora, filho!', on: true })}>
          <Icon name="bell" size={18} /> Disparar agora: "{(list[0]?.text ?? 'Treinou hoje? Bora, filho!').slice(0, 28)}"
        </button>
      ) : (
        <p className="muted">Ative as notificações acima para disparar.</p>
      )}
      {sent === 'erro' && <p className="bad">Não consegui enviar. Abra o app pelo ícone da tela de início.</p>}
    </section>
  )
}
