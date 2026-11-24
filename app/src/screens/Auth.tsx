import { useEffect, useState } from 'react'
import { editPhoto } from '../components/PhotoEditor'
import { type User, api, avatarUrl } from '../api'
import { Icon } from '../components/Icon'
import { PhotoButtons } from '../components/PhotoButtons'
import { Info } from '../components/Info'
import { getLang, t } from '../i18n'
import { isStandalone, notifyStatus } from '../notify'
import { InstallStep, NotifyStep } from '../components/InstallGuide'
import { toast } from '../components/Toast'
import { compress } from '../photos'
import type { AppState } from '../store'
import { LangPicker } from './Menu'

/** Entrar ou criar conta. */
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)
const StravaLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="#fff">
    <path d="M15.4 17.9l-2.1-4.1h-3.1l5.2 10.2 5.2-10.2h-3.1z" />
    <path d="M10.2 0L3.3 13.8h4.1l2.8-5.5 2.8 5.5h4.1z" opacity=".85" />
  </svg>
)

export function Auth({ s, onUser }: { s: AppState; onUser: (u: User) => void }) {
  const [mode, setMode] = useState<'entrar' | 'criar'>(() => (new URL(location.href).searchParams.get('entrar') ? 'entrar' : 'criar'))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [forgot, setForgot] = useState(false)
  const [prov, setProv] = useState<{ google?: boolean; strava?: boolean }>({})
  const [socialMsg, setSocialMsg] = useState('')
  // Google/Strava ainda não ligados: leva para a criação de conta normal
  const noSocial = (name: string) => {
    setMode('criar')
    setSocialMsg(t('Entrar com {p} chega em breve. Por enquanto, crie sua conta com e-mail: leva 30 segundos.', { p: name }))
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('form.card.field input')
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.focus()
    }, 50)
  }
  useEffect(() => {
    fetch('/api/auth/providers').then((r) => r.json()).then(setProv, () => {})
  }, [])

  // erro vindo do login com Google/Strava (volta como ?auth_error=...)
  useEffect(() => {
    const u = new URL(location.href)
    const e = u.searchParams.get('auth_error')
    if (e) {
      setErr(t(e))
      u.searchParams.delete('auth_error')
      history.replaceState(null, '', u.pathname + u.search)
    }
  }, [])

  const pickPhoto = async (raw?: File) => {
    const f = raw && (await editPhoto(raw, 1, true))
    if (!f) return
    try {
      setAvatar(await compress(f, 320))
    } catch {
      setErr(t('Não consegui abrir essa foto. Tente outra.'))
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const r = mode === 'criar' ? await api.signup({ name: name.trim(), email: email.trim(), password, avatar, lang: getLang() }) : await api.login(email.trim(), password)
      onUser(r.user)
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="onb auth">
      <div className="onb-body">
        <span className="brand-mark">
          <Icon name="flame" size={34} />
        </span>
        <h1>
          {mode === 'criar' ? t('Crie sua conta') : t('Entre na sua conta')}
          <Info
            text={
              mode === 'criar'
                ? t('Preencha seus dados e envie. Sua conta fica aguardando aprovação e você recebe um aviso quando for liberada.')
                : t('Use o e-mail e a senha que você cadastrou.')
            }
          />
        </h1>

        <div className="seg-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'criar'} className={mode === 'criar' ? 'on' : ''} onClick={() => setMode('criar')}>
            {t('Criar conta')}
          </button>
          <button type="button" role="tab" aria-selected={mode === 'entrar'} className={mode === 'entrar' ? 'on' : ''} onClick={() => setMode('entrar')}>
            {t('Entrar')}
          </button>
        </div>

        <div className="social">
          <a
            className="social-btn google"
            href="/api/auth/google"
            onClick={(e) => {
              if (prov.google) return
              e.preventDefault()
              noSocial('Google')
            }}
          >
            <GoogleLogo /> {mode === 'criar' ? t('Criar conta com Google') : t('Entrar com Google')}
          </a>
          <a
            className="social-btn strava"
            href="/api/auth/strava"
            onClick={(e) => {
              if (prov.strava) return
              e.preventDefault()
              noSocial('Strava')
            }}
          >
            <StravaLogo /> {mode === 'criar' ? t('Criar conta com Strava') : t('Entrar com Strava')}
          </a>
          {socialMsg && <p className="social-msg">{socialMsg}</p>}
          <p className="hint center-txt ttl">
            {t('ou com e-mail e senha')}
            <Info text={t('Com Google ou Strava você não precisa criar senha. Quem entra pelo Strava já deixa o relógio conectado ao app. Em todos os casos, a conta passa pela aprovação.')} />
          </p>
        </div>

        <form className="card field" onSubmit={submit}>
          {mode === 'criar' && (
            <>
              <div className="photo-wrap">
              <label className="avatar-pick">
                <input id="au-photo" type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0])} />
                <span className="avatar-big">{avatar ? <img src={avatar} alt="" /> : <Icon name="camera" size={28} />}</span>
                <span>
                  <b>{avatar ? t('Trocar foto de perfil') : t('Adicione sua foto de perfil')}</b>
                  <small>{t('Uma foto do seu rosto.')}</small>
                </span>
              </label>
              <PhotoButtons front onFile={pickPhoto} />
              </div>
              <label>
                {t('Seu nome')}
                <input id="au-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </label>
            </>
          )}
          <label>
            {t('E-mail')}
            <input id="au-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label>
            {t('Senha')}
            <input
              id="au-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'criar' ? 'new-password' : 'current-password'}
              minLength={6}
              required
              placeholder={mode === 'criar' ? t('Mínimo de 6 caracteres') : ''}
            />
          </label>
          {err && <p className="form-err">{err}</p>}
          <button type="submit" className="cta" disabled={busy}>
            {busy ? t('Enviando...') : mode === 'criar' ? t('Enviar solicitação de acesso') : t('Entrar')}
          </button>
          {mode === 'entrar' && (
            <button type="button" className="link" onClick={() => setForgot(!forgot)}>
              {t('Esqueci minha senha')}
            </button>
          )}
          {mode === 'entrar' && forgot && (
            <ol className="how-steps forgot">
              <li>
                <span>1</span>
                {t('Fale com o suporte pelo mesmo canal em que você comprou o app.')}
              </li>
              <li>
                <span>2</span>
                {t('Informe o e-mail da sua conta. O suporte gera uma senha nova e te manda.')}
              </li>
              <li>
                <span>3</span>
                {t('Entre com a senha nova e troque por uma sua em Perfil.')}
              </li>
            </ol>
          )}
          {mode === 'entrar' && (prov.google || prov.strava) && <p className="muted center-txt">{t('Se você criou a conta com Google ou Strava, use o mesmo botão lá em cima.')}</p>}
        </form>
        <LangPicker s={s} />
      </div>
    </div>
  )
}

/** Conta criada, aguardando o admin aprovar (ou recusada). */
export function Pending({ user, onUser, onLogout }: { user: User; onUser: (u: User) => void; onLogout: () => void }) {
  useEffect(() => {
    const check = () => api.me().then((r) => r.user.status !== user.status && onUser(r.user)).catch(() => {})
    const id = window.setInterval(check, 20_000)
    const vis = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [user.status, onUser])

  const rejected = user.status === 'rejected'
  const installed = isStandalone()
  const notifOn = notifyStatus() === 'granted'
  const [checking, setChecking] = useState(false)
  const first = user.name.split(' ')[0]
  if (rejected)
    return (
      <div className="onb auth">
        <div className="onb-body pending">
          <span className="avatar-big lg">{user.hasAvatar ? <img src={avatarUrl(user.id)} alt="" /> : (user.name || '?').slice(0, 1).toUpperCase()}</span>
          <h1>{t('Seu acesso não foi aprovado')}</h1>
          <p className="lead">{t('Se você acha que isso é um engano, fale com quem te indicou o app.')}</p>
          <button type="button" className="link center" onClick={onLogout}>
            {t('Sair desta conta')}
          </button>
        </div>
      </div>
    )
  const Step = ({ n, state, title, children }: { n: number; state: 'done' | 'now' | 'todo'; title: string; children?: React.ReactNode }) => (
    <li className={`tl-step ${state}`}>
      <span className="tl-dot">{state === 'done' ? <Icon name="check" size={14} stroke={3} /> : n}</span>
      <div className="tl-body">
        <b>{title}</b>
        {children}
      </div>
    </li>
  )
  return (
    <div className="onb auth">
      <div className="onb-body pending">
        <span className="avatar-big lg">{user.hasAvatar ? <img src={avatarUrl(user.id)} alt="" /> : (user.name || '?').slice(0, 1).toUpperCase()}</span>
        <h1>{t('Conta criada, {nome}!', { nome: first })}</h1>
        <p className="lead">{t('Falta só a liberação do seu acesso. Enquanto isso, deixe o app pronto no seu celular seguindo os passos abaixo.')}</p>
        <ol className="timeline card">
          <Step n={1} state="done" title={t('Conta criada')}>
            <small>{t('Seus dados já estão salvos.')}</small>
          </Step>
          <Step n={2} state="now" title={t('Aguardando liberação')}>
            <small>{t('A gente confere cada conta antes de liberar. Você não precisa fazer nada nesta etapa.')}</small>
          </Step>
          <Step n={3} state={installed ? 'done' : 'now'} title={t('Coloque o app na tela de início do celular')}>
            <small>{t('Assim ele abre como um aplicativo e pode te mandar as cobranças.')}</small>
            <InstallStep />
          </Step>
          <Step n={4} state={notifOn ? 'done' : installed ? 'now' : 'todo'} title={t('Ative os avisos')}>
            <small>{t('Você recebe "Acesso liberado" no celular assim que for aprovado.')}</small>
            <NotifyStep okText={t('Avisos ativados. Pode fechar o app: a gente te avisa.')} />
          </Step>
          <Step n={5} state="todo" title={t('Entre no app')}>
            <small>{t('Quando liberar, é só abrir o app: você entra direto. Já recebeu o aviso? Toque abaixo.')}</small>
            <button
              type="button"
              className="ghost-btn ig-btn"
              disabled={checking}
              onClick={async () => {
                setChecking(true)
                try {
                  const r = await api.me()
                  if (r.user.status !== user.status) onUser(r.user)
                  else toast(t('Ainda não foi liberado'), t('Assim que for, você recebe o aviso.'))
                } catch {
                  /* sem conexão */
                }
                setChecking(false)
              }}
            >
              <Icon name="refresh" size={18} /> {checking ? t('Verificando...') : t('Já fui aprovado? Verificar')}
            </button>
          </Step>
        </ol>
        <button type="button" className="link center" onClick={onLogout}>
          {t('Sair desta conta')}
        </button>
      </div>
    </div>
  )
}
