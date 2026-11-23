import { useEffect, useState } from 'react'
import { type User, api, avatarUrl } from '../api'
import { Icon } from '../components/Icon'
import { Info } from '../components/Info'
import { getLang, t } from '../i18n'
import { enableNotifications, notifyStatus } from '../notify'
import { compress } from '../photos'
import type { AppState } from '../store'
import { LangPicker } from './Menu'

/** Entrar ou criar conta. */
export function Auth({ s, onUser }: { s: AppState; onUser: (u: User) => void }) {
  const [mode, setMode] = useState<'entrar' | 'criar'>('criar')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const pickPhoto = async (f?: File) => {
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

        <form className="card field" onSubmit={submit}>
          {mode === 'criar' && (
            <>
              <label className="avatar-pick">
                <input id="au-photo" type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0])} />
                <span className="avatar-big">{avatar ? <img src={avatar} alt="" /> : <Icon name="camera" size={28} />}</span>
                <span>
                  <b>{avatar ? t('Trocar foto de perfil') : t('Adicione sua foto de perfil')}</b>
                  <small>{t('Toque para escolher uma foto do rosto.')}</small>
                </span>
              </label>
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
        </form>
        <LangPicker s={s} />
      </div>
    </div>
  )
}

/** Conta criada, aguardando o admin aprovar (ou recusada). */
export function Pending({ user, onUser, onLogout }: { user: User; onUser: (u: User) => void; onLogout: () => void }) {
  const [st, setSt] = useState(notifyStatus())
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
  return (
    <div className="onb auth">
      <div className="onb-body pending">
        <span className="avatar-big lg">{user.hasAvatar ? <img src={avatarUrl(user.id)} alt="" /> : (user.name || '?').slice(0, 1).toUpperCase()}</span>
        <h1>{rejected ? t('Seu acesso não foi aprovado') : t('Solicitação enviada, {nome}', { nome: user.name.split(' ')[0] })}</h1>
        <p className="lead">
          {rejected
            ? t('Se você acha que isso é um engano, fale com quem te indicou o app.')
            : t('Sua conta está aguardando aprovação. Assim que for liberada, você entra direto no app.')}
        </p>
        {!rejected && (
          <div className="card field">
            <b className="ttl">
              {t('Quer ser avisado quando for aprovado?')}
              <Info text={t('Ative as notificações e você recebe um aviso no celular assim que a sua conta for liberada.')} />
            </b>
            {st === 'granted' ? (
              <p className="ok-line">
                <Icon name="check" size={18} stroke={3} /> {t('Notificações ativadas')}
              </p>
            ) : st === 'default' ? (
              <button type="button" className="ghost-btn" onClick={async () => setSt(await enableNotifications())}>
                <Icon name="bell" size={18} /> {t('Ativar notificações')}
              </button>
            ) : (
              <p className="muted">{t('No iPhone: Compartilhar e depois "Adicionar à Tela de Início". Abra pelo ícone e ative aqui.')}</p>
            )}
          </div>
        )}
        <button type="button" className="ghost-btn" onClick={() => api.me().then((r) => onUser(r.user)).catch(() => {})}>
          <Icon name="refresh" size={18} /> {t('Verificar agora')}
        </button>
        <button type="button" className="link center" onClick={onLogout}>
          {t('Sair desta conta')}
        </button>
      </div>
    </div>
  )
}
