import { useState } from 'react'
import { Icon } from '../components/Icon'
import { t } from '../i18n'
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
        <button type="button" className="round-btn" onClick={onBack} aria-label={t('Voltar')}>
          <Icon name="back" />
        </button>
        <span className="coach-av lg">
          <Icon name="flame" size={26} />
        </span>
        <div>
          <b>{t('Seu treinador')}</b>
          <small>
            {TONE_EMOJI[s.profile.tone]} {t('modo {x}', { x: toneLabel()[s.profile.tone].name.toLowerCase() })}
          </small>
        </div>
      </header>

      <div className="tone-pick">
        {(Object.keys(toneLabel()) as Tone[]).map((tn) => (
          <button
            key={tn}
            type="button"
            className={`tone tone-${tn} ${s.profile.tone === tn ? 'on' : ''}`}
            onClick={() => setState((st) => ({ ...st, profile: { ...st.profile, tone: tn } }))}
          >
            <span className="tone-emo">{TONE_EMOJI[tn]}</span>
            <b>{toneLabel()[tn].name}</b>
          </button>
        ))}
      </div>

      {status !== 'granted' && (
        <section className="card notif">
          <span className="notif-ic">
            <Icon name="bell" />
          </span>
          <div>
            <b>{t('Deixe eu te cobrar fora do app')}</b>
            <small>
              {status === 'default' && t('Ative as notificações.')}
              {status === 'denied' && t('Você bloqueou. Libere nas configurações do navegador.')}
              {status === 'needs-install' && t('No iPhone: Compartilhar e depois "Adicionar à Tela de Início".')}
              {status === 'unsupported' && t('Instale o app no celular para ativar.')}
            </small>
          </div>
          {status === 'default' && (
            <button type="button" className="pill-btn sm" onClick={async () => setStatus(await enableNotifications())}>
              {t('Ativar')}
            </button>
          )}
        </section>
      )}

      <div className="chat">
        <span className="chat-day">{t('Hoje')}</span>
        {past.length === 0 && <p className="muted center-txt">{t('Ainda tá cedo. A primeira mensagem sai às {h}.', { h: list[0]?.time ?? '' })}</p>}
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
            <small>{t('próxima às {h}', { h: next.time })}</small>
          </div>
        )}
      </div>

      <section className={`card test-mode ${s.testEvery ? 'on' : ''}`}>
        <div>
          <b>🧪 {t('Modo teste: a cada 5 min')}</b>
          <small>{s.testEvery ? t('Ligado. Deixe o app aberto para receber.') : t('Para ver as cobranças chegando. Funciona com o app aberto.')}</small>
        </div>
        <button
          type="button"
          className={`switch ${s.testEvery ? 'on' : ''}`}
          aria-pressed={!!s.testEvery}
          aria-label={t('Modo teste a cada 5 minutos')}
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
    const ok = await show(t('Recado seu'), n.text)
    setSent(ok ? n.id : 'erro')
    setTimeout(() => setSent(null), 2500)
  }

  return (
    <section className="card block mine">
      <div className="block-h">
        <h2>{t('Suas cobranças')}</h2>
        <span className="soft-chip">{t('todo dia')}</span>
      </div>
      <p className="hint">{t('Escreva do seu jeito. Elas chegam como notificação no horário.')}</p>
      <ul className="mine-list">
        {list.map((n) => (
          <li key={n.id} className={n.on ? '' : 'off'}>
            <input
              id={`cn-t-${n.id}`}
              type="time"
              value={n.time}
              onChange={(e) => save(list.map((x) => (x.id === n.id ? { ...x, time: e.target.value } : x)))}
              aria-label={t('Horário')}
            />
            <span className="mine-text">{n.text}</span>
            <button type="button" className="mine-send" onClick={() => send(n)} disabled={!canSend} aria-label={t('Enviar agora')}>
              {sent === n.id ? <Icon name="check" size={16} stroke={3} /> : <Icon name="play" size={14} />}
            </button>
            <button type="button" className="mine-del" onClick={() => save(list.filter((x) => x.id !== n.id))} aria-label={t('Apagar')}>
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
        <input id="cn-new-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t('Horário')} />
        <input id="cn-new-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Ex.: Larga o celular e vai treinar')} />
        <button type="submit" className="mine-plus" aria-label={t('Adicionar')}>
          <Icon name="plus" size={18} stroke={2.5} />
        </button>
      </form>
      {canSend ? (
        <button type="button" className="cta" onClick={() => send(list[0] ?? { id: 'x', time: '', text: t('Treinou hoje? Bora, filho!'), on: true })}>
          <Icon name="bell" size={18} /> {t('Disparar agora')}: "{(list[0]?.text ?? t('Treinou hoje? Bora, filho!')).slice(0, 28)}"
        </button>
      ) : (
        <p className="muted">{t('Ative as notificações acima para disparar.')}</p>
      )}
      {sent === 'erro' && <p className="bad">{t('Não consegui enviar. Abra o app pelo ícone da tela de início.')}</p>}
    </section>
  )
}
