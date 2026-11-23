// Entrar com Google e com Strava (OAuth 2.0, fluxo de código).
// Variáveis no Railway: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET.
// Endereços de retorno a cadastrar nos painéis:
//   Google: https://SEU-DOMINIO/api/auth/google/callback
//   Strava: domínio de callback = SEU-DOMINIO (sem https://)
import { randomBytes } from 'node:crypto'

export const providers = () => ({
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  strava: !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET),
})

export function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'http'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

export const newState = () => randomBytes(16).toString('hex')

export function authorizeUrl(provider, req, state) {
  const redirect = `${baseUrl(req)}/api/auth/${provider}/callback`
  if (provider === 'google') {
    const p = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirect,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
  }
  const p = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: redirect,
    response_type: 'code',
    scope: 'read,activity:read',
    approval_prompt: 'auto',
    state,
  })
  return `https://www.strava.com/oauth/authorize?${p}`
}

/** Troca o código pelo perfil da pessoa. Retorna { sub, email, name, picture, tokens? }. */
export async function exchange(provider, req, code) {
  const redirect = `${baseUrl(req)}/api/auth/${provider}/callback`
  if (provider === 'google') {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirect, grant_type: 'authorization_code' }),
    })
    const j = await r.json()
    if (!r.ok || !j.id_token) throw new Error('Google recusou o login')
    // o id_token veio direto do Google por HTTPS com o nosso segredo: dá para ler o conteúdo
    const claims = JSON.parse(Buffer.from(j.id_token.split('.')[1], 'base64url').toString('utf8'))
    if (claims.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('Login do Google inválido')
    if (!claims.email || claims.email_verified === false) throw new Error('Seu e-mail do Google não está verificado')
    return { sub: claims.sub, email: claims.email.toLowerCase(), name: claims.name || claims.email.split('@')[0], picture: claims.picture }
  }
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, code, grant_type: 'authorization_code' }),
  })
  const j = await r.json()
  if (!r.ok || !j.athlete) throw new Error('Strava recusou o login')
  const a = j.athlete
  return {
    sub: String(a.id),
    email: null, // o Strava não informa e-mail
    name: [a.firstname, a.lastname].filter(Boolean).join(' ') || 'Atleta Strava',
    picture: a.profile && !String(a.profile).includes('avatar/athlete') ? a.profile : null,
    tokens: { access: j.access_token, refresh: j.refresh_token, expiresAt: j.expires_at },
  }
}

/** Baixa a foto do perfil (até 400 KB). */
export async function fetchPicture(url) {
  if (!url) return null
  try {
    const r = await fetch(url)
    const type = (r.headers.get('content-type') || '').split(';')[0]
    if (!r.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return null
    const buf = Buffer.from(await r.arrayBuffer())
    return buf.length <= 400_000 ? { buf, type } : null
  } catch {
    return null
  }
}
