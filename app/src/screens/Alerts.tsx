import { useState } from 'react'
import { Icon } from '../components/Icon'
import { enableNotifications, notifyStatus, show } from '../notify'
import { dailySchedule, toneLabel } from '../psych'
import { type AppState, type Tone, setState } from '../store'

export function Alerts({ s }: { s: AppState }) {
  const [status, setStatus] = useState(notifyStatus())
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const list = dailySchedule(s)
  const past = list.filter((n) => n.time <= hhmm).reverse()
  const next = list.filter((n) => n.time > hhmm)

  return (
    <div className="screen">
      <header className="page-h">
        <span className="eyebrow">Cobranças</span>
        <h1>Ninguém vai te deixar em paz</h1>
      </header>

      <section className="card block notif">
        <div className="notif-h">
          <span className={`notif-ic ${status === 'granted' ? 'on' : ''}`}>
            <Icon name="bell" />
          </span>
          <div>
            <b>{status === 'granted' ? 'Notificações ativadas' : 'Ative as notificações no celular'}</b>
            <small>
              {status === 'granted' && 'Você vai receber cada cobrança abaixo no horário.'}
              {status === 'default' && 'Sem isso o app não consegue te cobrar fora da tela.'}
              {status === 'denied' && 'Você bloqueou. Libere nas configurações do navegador.'}
              {status === 'needs-install' && 'No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início". Abra pelo ícone e volte aqui.'}
              {status === 'unsupported' && 'Abra pelo app instalado (Chrome no Android ou Safari no iPhone) para ativar.'}
            </small>
          </div>
        </div>
        {status === 'default' && (
          <button type="button" className="cta" onClick={async () => setStatus(await enableNotifications())}>
            Ativar cobranças
          </button>
        )}
        {status === 'granted' && (
          <button type="button" className="ghost-btn" onClick={() => show(next[0]?.title ?? 'Teste', next[0]?.body ?? 'Funcionando.')}>
            Enviar um teste agora
          </button>
        )}
      </section>

      <section className="card block">
        <h2>Nível de dureza</h2>
        <div className="tone-pick">
          {(Object.keys(toneLabel) as Tone[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`tone tone-${t} ${s.profile.tone === t ? 'on' : ''}`}
              onClick={() => setState((st) => ({ ...st, profile: { ...st.profile, tone: t } }))}
            >
              <b>{toneLabel[t].name}</b>
              <small>{toneLabel[t].desc}</small>
            </button>
          ))}
        </div>
      </section>

      {next.length > 0 && (
        <section className="block-plain">
          <h2 className="sec-title">Próximas hoje</h2>
          <ul className="feed">
            {next.map((n) => (
              <li key={n.moment + n.time} className="card feed-item is-next">
                <span className="feed-time">{n.time}</span>
                <div>
                  <b>{n.title}</b>
                  <p>{n.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="block-plain">
        <h2 className="sec-title">Já enviadas hoje</h2>
        {past.length === 0 && <p className="muted">Nenhuma ainda. A primeira sai às {list[0]?.time}.</p>}
        <ul className="feed">
          {past.map((n) => (
            <li key={n.moment + n.time} className={`card feed-item ${n.moment === 'checkin_atrasado' ? 'is-hot' : ''}`}>
              <span className="feed-time">{n.time}</span>
              <div>
                <b>{n.title}</b>
                <p>{n.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
