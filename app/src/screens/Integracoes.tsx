import { useEffect, useRef, useState } from 'react'
import { type CalEvent, type User, api } from '../api'
import { hhmmOf, refreshEvents } from '../calendar'
import { Icon } from '../components/Icon'
import { Info, WithInfo } from '../components/Info'
import { t, weekdayShort } from '../i18n'
import { isServerMode } from '../notify'
import { type AppState, type Profile, setState } from '../store'

type Plat = 'google' | 'iphone' | 'android'

const STEPS: Record<Plat, string[]> = {
  google: [
    'No computador, abra calendar.google.com.',
    'Clique na engrenagem no canto de cima e depois em Configurações.',
    'Na coluna da esquerda, em "Configurações das minhas agendas", clique na sua agenda.',
    'Role até "Integrar agenda" e copie o "Endereço secreto no formato iCal".',
    'Volte aqui, cole o link abaixo e toque em Conectar agenda.',
  ],
  iphone: [
    'Abra o app Calendário do iPhone.',
    'Toque em "Calendários", na parte de baixo da tela.',
    'Toque no "i" ao lado da agenda que você usa.',
    'Ative "Calendário Público" e toque em "Compartilhar Link".',
    'Toque em "Copiar", volte aqui, cole o link abaixo e toque em Conectar agenda.',
  ],
  android: [
    'No Android, a agenda normalmente é a do Google.',
    'Abra o Chrome, entre em calendar.google.com e, no menu (três pontinhos), ative "Versão para computador".',
    'Toque na engrenagem, em Configurações e depois na sua agenda.',
    'Role até "Integrar agenda" e copie o "Endereço secreto no formato iCal".',
    'Volte aqui, cole o link abaixo e toque em Conectar agenda.',
  ],
}

const fmtDay = (iso: string) => {
  const d = new Date(iso)
  return `${weekdayShort(d.getDay())} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function Integracoes({ s, user, onUser }: { s: AppState; user: User | null; onUser?: (u: User) => void }) {
  const p = s.profile
  const server = isServerMode()
  const [plat, setPlat] = useState<Plat>(/iphone|ipad/i.test(navigator.userAgent) ? 'iphone' : /android/i.test(navigator.userAgent) ? 'android' : 'google')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState<CalEvent[] | null>(null)
  const [msg, setMsg] = useState('')
  const justConnected = useRef(false)
  const upd = (patch: Partial<Profile>) => setState((st) => ({ ...st, profile: { ...st.profile, ...patch } }))

  // volta do "Conectar Strava"
  useEffect(() => {
    const u = new URL(location.href)
    const r = u.searchParams.get('integracao')
    if (!r) return
    if (r === 'strava_ok') setMsg(t('Strava conectado.'))
    if (r === 'strava_em_uso') setErr(t('Essa conta do Strava já está ligada a outro usuário.'))
    u.searchParams.delete('integracao')
    history.replaceState(null, '', u.pathname + u.search)
    if (user && onUser) api.me().then((x) => onUser(x.user)).catch(() => {})
  }, [user, onUser])

  // compromissos da agenda já conectada
  useEffect(() => {
    if (!server || !p.icalUrl) return
    if (justConnected.current) {
      justConnected.current = false // a lista já veio do teste do link
      return
    }
    api
      .calendar()
      .then((r) => {
        setPreview(r.events)
        if (r.error) setErr(t(r.error))
      })
      .catch(() => {})
  }, [server, p.icalUrl])

  const connect = async () => {
    setErr('')
    setBusy(true)
    try {
      const r = await api.calendarTest(link)
      justConnected.current = true
      upd({ icalUrl: r.url })
      setPreview(r.events)
      setLink('')
      setMsg(r.events.length === 1 ? t('Agenda conectada. 1 compromisso nos próximos 7 dias.') : t('Agenda conectada. {n} compromissos nos próximos 7 dias.', { n: r.events.length }))
      setTimeout(() => refreshEvents(true), 2500) // depois que os dados forem salvos
    } catch (e) {
      setErr(t((e as Error).message))
    } finally {
      setBusy(false)
    }
  }

  const hostOf = (u: string) => {
    try {
      return new URL(u).hostname.includes('icloud') ? 'iCloud (iPhone)' : new URL(u).hostname.includes('google') ? 'Google Agenda' : 'Outlook'
    } catch {
      return ''
    }
  }
  const ig = p.integrations || {}

  return (
    <div className="form integr">
      <h1 className="ttl">
        {t('Integrações')}
        <Info text={t('Conecte sua agenda, seu Strava e o app da sua academia. Cada conexão é só sua: ninguém mais vê seus dados.')} />
      </h1>
      {msg && <p className="ok-line">{msg}</p>}
      {err && <p className="form-err">{err}</p>}

      {/* ---------- agenda ---------- */}
      <section className="card field">
        <div className="integ-h">
          <span className="integ-ic">
            <Icon name="calendar" size={22} />
          </span>
          <span>
            <b className="ttl">
              {t('Agenda')}
              <Info text={t('O app lê seus compromissos e coloca na sua lista do dia, com uma cobrança 15 minutos antes de cada um. Funciona com Google Agenda, iPhone e Android.')} />
            </b>
            <small>{p.icalUrl ? t('Conectada: {x}', { x: hostOf(p.icalUrl) }) : t('Não conectada')}</small>
          </span>
          <span className={`integ-status ${p.icalUrl ? 'on' : ''}`}>{p.icalUrl ? t('Ativa') : t('Desligada')}</span>
        </div>

        {!server && <p className="muted">{t('A agenda funciona na versão com conta. Entre pelo endereço do app no Railway.')}</p>}

        {server && p.icalUrl && (
          <>
            {preview && preview.length > 0 ? (
              <ul className="cal-list">
                {preview.slice(0, 6).map((e) => (
                  <li key={e.uid}>
                    <small>{fmtDay(e.start)}</small>
                    <b>{e.allDay ? t('Dia todo') : hhmmOf(e.start)}</b>
                    <span>{e.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{t('Nenhum compromisso nos próximos 7 dias.')}</p>
            )}
            <div className="row2">
              <button type="button" className="ghost-btn" onClick={() => refreshEvents(true).then(() => api.calendar().then((r) => setPreview(r.events)))}>
                <Icon name="refresh" size={16} /> {t('Atualizar')}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  upd({ icalUrl: '' })
                  setPreview(null)
                  setMsg(t('Agenda desconectada.'))
                }}
              >
                {t('Desconectar')}
              </button>
            </div>
          </>
        )}

        {server && !p.icalUrl && (
          <>
            <div className="seg-tabs three" role="tablist">
              {(
                [
                  ['google', 'Google Agenda'],
                  ['iphone', 'iPhone'],
                  ['android', 'Android'],
                ] as [Plat, string][]
              ).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={plat === id} className={plat === id ? 'on' : ''} onClick={() => setPlat(id)}>
                  {label}
                </button>
              ))}
            </div>
            <ol className="steps-num">
              {STEPS[plat].map((st, i) => (
                <li key={i}>
                  <i>{i + 1}</i>
                  <span>{t(st)}</span>
                </li>
              ))}
            </ol>
            {plat !== 'iphone' && (
              <p className="hint">{t('Use o endereço secreto: só quem tem o link vê sua agenda, e você não precisa deixá-la pública para todo mundo.')}</p>
            )}
            <label>
              {t('Link da sua agenda')}
              <input id="cal-link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder={plat === 'iphone' ? 'webcal://p00-caldav.icloud.com/...' : 'https://calendar.google.com/calendar/ical/...'} />
            </label>
            <WithInfo text={t('O app testa o link e mostra seus próximos compromissos. Se der certo, a agenda fica conectada.')}>
              <button type="button" className="cta" disabled={!link.trim() || busy} onClick={connect}>
                {busy ? t('Conectando...') : t('Conectar agenda')}
              </button>
            </WithInfo>
          </>
        )}
      </section>

      {/* ---------- Strava ---------- */}
      <section className="card field">
        <div className="integ-h">
          <span className="integ-ic strava">
            <Icon name="run" size={22} />
          </span>
          <span>
            <b className="ttl">
              Strava
              <Info text={t('Conecte para o app usar seus treinos de corrida, bike e caminhada. Funciona com relógios Garmin, Amazfit, Polar, Coros e Apple Watch sincronizados com o Strava.')} />
            </b>
            <small>{user?.strava ? t('Conectado') : t('Não conectado')}</small>
          </span>
          <span className={`integ-status ${user?.strava ? 'on' : ''}`}>{user?.strava ? t('Ativo') : t('Desligado')}</span>
        </div>
        {!server ? (
          <p className="muted">{t('O Strava funciona na versão com conta.')}</p>
        ) : user?.strava ? (
          <>
            <p className="hint">{t('Em breve: o cardio do Strava entra sozinho na sua prestação de contas.')}</p>
            {user.provider !== 'strava' && (
              <button
                type="button"
                className="ghost-btn"
                onClick={() =>
                  api
                    .disconnectStrava()
                    .then(() => api.me())
                    .then((x) => onUser?.(x.user))
                    .catch((e) => setErr(e.message))
                }
              >
                {t('Desconectar Strava')}
              </button>
            )}
          </>
        ) : (
          <a className="social-btn strava" href="/api/auth/strava?link=1">
            {t('Conectar Strava')}
          </a>
        )}
      </section>

      {/* ---------- academias ---------- */}
      {(
        [
          ['wellhub', 'Gympass (Wellhub)', 'https://wellhub.com/pt-br/'],
          ['totalpass', 'TotalPass', 'https://totalpass.com/br/'],
        ] as ['wellhub' | 'totalpass', string, string][]
      ).map(([key, name, url]) => (
        <section key={key} className="card field">
          <div className="integ-h">
            <span className={`integ-ic ${key}`}>
              <Icon name="dumbbell" size={22} />
            </span>
            <span>
              <b className="ttl">
                {name}
                <Info
                  text={t(
                    '{x} ainda não libera os check-ins para outros apps. Ative se você usa: o app mostra o botão "Fiz check-in na academia" no dia de treino e um atalho para abrir o {x}.',
                    { x: name },
                  )}
                />
              </b>
              <small>{ig[key] ? t('Você usa · registro manual') : t('Toque para ativar se você usa')}</small>
            </span>
            <button
              type="button"
              className={`switch ${ig[key] ? 'on' : ''}`}
              aria-pressed={!!ig[key]}
              aria-label={name}
              onClick={() => upd({ integrations: { ...ig, [key]: !ig[key] } })}
            >
              <i />
            </button>
          </div>
          {ig[key] && (
            <a className="ghost-btn" href={url} target="_blank" rel="noreferrer">
              {t('Abrir o {x}', { x: name })}
            </a>
          )}
        </section>
      ))}
    </div>
  )
}
