// Servidor do Dont Sorry IA: entrega o app, guarda as contas e os dados, e envia as notificações.
// Variáveis: DATABASE_URL (obrigatória), PORT e ADMIN_EMAIL (opcional: quem vira admin; sem ela, a primeira conta criada vira admin).
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import bcrypt from 'bcryptjs'
import { getSetting, migrate, q, setSetting } from './db.mjs'
import { initPush, notifyAdmins, sendToUser, startScheduler, vapidPublicKey } from './push.mjs'
import { authorizeUrl, exchange, fetchPicture, newState, providers } from './oauth.mjs'
import { eventsFor, normalizeUrl } from './calendar.mjs'
import { parsePlan, planReady } from './plan.mjs'
import { canSeeAvatar, migrateSocial, registerSocial, startRankScheduler } from './social.mjs'

const DIST = join(import.meta.dirname, '..', 'dist')
const PORT = Number(process.env.PORT) || 3000
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const SESSION_DAYS = 90

// ---------- utilidades ----------
class HttpError extends Error {
  constructor(status, msg) {
    super(msg)
    this.status = status
  }
}
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}
async function readJson(req, limit = 3_000_000) {
  let size = 0
  const chunks = []
  for await (const c of req) {
    size += c.length
    if (size > limit) throw new HttpError(413, 'Conteúdo grande demais')
    chunks.push(c)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'JSON inválido')
  }
}
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=').map(decodeURIComponent)).filter((p) => p[0]))
const isHttps = (req) => req.headers['x-forwarded-proto'] === 'https'
const sessionCookie = (req, token, maxAge) =>
  `sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`

function parseAvatar(dataUrl) {
  if (!dataUrl) return null
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl)
  if (!m) throw new HttpError(400, 'Foto inválida')
  const buf = Buffer.from(m[2], 'base64')
  if (buf.length > 400_000) throw new HttpError(413, 'Foto grande demais')
  return { type: m[1], buf }
}
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  status: u.status,
  role: u.role,
  hasAvatar: !!u.avatar_type,
  notifPaused: u.notif_paused,
  createdAt: u.created_at,
})

async function newSession(userId) {
  const token = randomBytes(32).toString('hex')
  await q(`insert into sessions (token, user_id, expires_at) values ($1, $2, now() + interval '${SESSION_DAYS} days')`, [token, userId])
  return token
}
async function currentUser(req) {
  const sid = cookies(req).sid
  if (!sid) return null
  const r = await q(`select u.* from sessions s join users u on u.id = s.user_id where s.token = $1 and s.expires_at > now()`, [sid])
  return r.rows[0] || null
}
async function requireUser(req, { approved = true } = {}) {
  const u = await currentUser(req)
  if (!u) throw new HttpError(401, 'Entre na sua conta')
  if (approved && u.status !== 'approved') throw new HttpError(403, 'Conta aguardando aprovação')
  return u
}
async function requireAdmin(req) {
  const u = await requireUser(req)
  if (u.role !== 'admin') throw new HttpError(403, 'Só o administrador pode fazer isso')
  return u
}

// tentativas de login: no máximo 10 por e-mail a cada 15 minutos
const attempts = new Map()
function checkAttempts(email) {
  const now = Date.now()
  const list = (attempts.get(email) || []).filter((t) => now - t < 15 * 60_000)
  if (list.length >= 10) throw new HttpError(429, 'Muitas tentativas. Tente de novo em 15 minutos.')
  list.push(now)
  attempts.set(email, list)
}

// ---------- rotas da API ----------
const routes = []
const route = (method, path, fn) => routes.push({ method, re: new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn })

route('POST', '/api/auth/signup', async (req, res) => {
  const b = await readJson(req)
  const email = String(b.email || '').trim().toLowerCase()
  const name = String(b.name || '').trim().slice(0, 60)
  const password = String(b.password || '')
  if (!name) throw new HttpError(400, 'Informe seu nome')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'E-mail inválido')
  if (password.length < 6) throw new HttpError(400, 'A senha precisa ter pelo menos 6 caracteres')
  const exists = await q('select 1 from users where email = $1', [email])
  if (exists.rows.length) throw new HttpError(409, 'Já existe uma conta com esse e-mail. Entre com sua senha.')
  const avatar = parseAvatar(b.avatar)
  // admin: o e-mail de ADMIN_EMAIL, ou, se não houver, a primeira conta criada no servidor
  const noUsers = (await q('select count(*)::int as n from users')).rows[0].n === 0
  const isAdmin = ADMIN_EMAIL ? email === ADMIN_EMAIL : noUsers
  const r = await q(
    `insert into users (email, name, password_hash, avatar, avatar_type, status, role, approved_at, lang, tz)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
    [email, name, await bcrypt.hash(password, 10), avatar?.buf || null, avatar?.type || null, isAdmin ? 'approved' : 'pending', isAdmin ? 'admin' : 'user', isAdmin ? new Date() : null, b.lang || 'pt', b.tz || 'America/Sao_Paulo'],
  )
  const u = r.rows[0]
  const token = await newSession(u.id)
  if (!isAdmin) notifyAdmins('Nova solicitação de acesso', `${name} (${email}) quer entrar no app.`).catch(() => {})
  send(res, 201, { user: publicUser(u) }, { 'Set-Cookie': sessionCookie(req, token, SESSION_DAYS * 86400) })
})

// ---------- entrar com Google / Strava ----------
const redirect = (res, to, headers = {}) => {
  res.writeHead(302, { Location: to, 'Cache-Control': 'no-store', ...headers })
  res.end()
}
const authError = (res, msg) => redirect(res, `/?auth_error=${encodeURIComponent(msg)}`)
const PROVIDER_NAME = { google: 'Google', strava: 'Strava' }

route('GET', '/api/auth/providers', async (req, res) => send(res, 200, providers()))

route('GET', '/api/auth/:provider', async (req, res, p) => {
  if (!PROVIDER_NAME[p.provider]) throw new HttpError(404, 'Rota não encontrada')
  if (!providers()[p.provider]) return authError(res, `O login com ${PROVIDER_NAME[p.provider]} ainda não foi configurado.`)
  const state = newState()
  const link = new URL(req.url, 'http://x').searchParams.get('link') === '1' ? '.link' : ''
  redirect(res, authorizeUrl(p.provider, req, state), {
    'Set-Cookie': `oauth_state=${state}${link}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=600${isHttps(req) ? '; Secure' : ''}`,
  })
})

route('GET', '/api/auth/:provider/callback', async (req, res, p) => {
  const prov = p.provider
  if (!PROVIDER_NAME[prov]) throw new HttpError(404, 'Rota não encontrada')
  const url = new URL(req.url, 'http://x')
  if (url.searchParams.get('error')) return authError(res, 'Login cancelado.')
  const [savedState, linkFlag] = String(cookies(req).oauth_state || '').split('.')
  if (!url.searchParams.get('state') || url.searchParams.get('state') !== savedState) return authError(res, 'Não deu para confirmar o login. Tente de novo.')
  let info
  try {
    info = await exchange(prov, req, url.searchParams.get('code') || '')
  } catch (e) {
    return authError(res, e.message)
  }
  const col = prov === 'google' ? 'google_sub' : 'strava_id'
  // modo "conectar": quem já está logado liga o Strava/Google à própria conta
  const me = linkFlag === 'link' ? await currentUser(req) : null
  if (me) {
    const other = (await q(`select id from users where ${col} = $1 and id <> $2`, [info.sub, me.id])).rows[0]
    if (other) return redirect(res, `/?integracao=${prov}_em_uso`)
    await q(`update users set ${col} = $1 where id = $2`, [info.sub, me.id])
    if (info.tokens) {
      await q(
        `insert into strava_tokens (user_id, athlete_id, access_token, refresh_token, expires_at) values ($1, $2, $3, $4, $5)
         on conflict (user_id) do update set athlete_id = excluded.athlete_id, access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at, updated_at = now()`,
        [me.id, info.sub, info.tokens.access, info.tokens.refresh, info.tokens.expiresAt],
      )
    }
    return redirect(res, `/?integracao=${prov}_ok`)
  }
  let u = (await q(`select * from users where ${col} = $1`, [info.sub])).rows[0]
  if (!u && info.email) {
    // conta já existente com o mesmo e-mail: liga o Google a ela
    u = (await q('select * from users where email = $1', [info.email])).rows[0]
    if (u) await q(`update users set ${col} = $1 where id = $2`, [info.sub, u.id])
  }
  let created = false
  if (!u) {
    const email = info.email || `strava-${info.sub}@strava.invalid`
    const noUsers = (await q('select count(*)::int as n from users')).rows[0].n === 0
    const isAdmin = ADMIN_EMAIL ? email === ADMIN_EMAIL : noUsers
    const pic = await fetchPicture(info.picture)
    u = (
      await q(
        `insert into users (email, name, password_hash, avatar, avatar_type, status, role, approved_at, provider, ${col})
         values ($1, $2, '', $3, $4, $5, $6, $7, $8, $9) returning *`,
        [email, info.name.slice(0, 60), pic?.buf || null, pic?.type || null, isAdmin ? 'approved' : 'pending', isAdmin ? 'admin' : 'user', isAdmin ? new Date() : null, prov, info.sub],
      )
    ).rows[0]
    created = !isAdmin
  }
  if (info.tokens) {
    await q(
      `insert into strava_tokens (user_id, athlete_id, access_token, refresh_token, expires_at) values ($1, $2, $3, $4, $5)
       on conflict (user_id) do update set access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at, updated_at = now()`,
      [u.id, info.sub, info.tokens.access, info.tokens.refresh, info.tokens.expiresAt],
    )
  }
  if (created) notifyAdmins('Nova solicitação de acesso', `${u.name} (via ${PROVIDER_NAME[prov]}) quer entrar no app.`).catch(() => {})
  const token = await newSession(u.id)
  redirect(res, '/', { 'Set-Cookie': sessionCookie(req, token, SESSION_DAYS * 86400) })
})

route('POST', '/api/auth/login', async (req, res) => {
  const b = await readJson(req)
  const email = String(b.email || '').trim().toLowerCase()
  checkAttempts(email)
  const r = await q('select * from users where email = $1', [email])
  const u = r.rows[0]
  if (u && !u.password_hash) throw new HttpError(401, `Essa conta foi criada com ${u.provider === 'google' ? 'Google' : 'Strava'}. Use o botão de entrar com ${u.provider === 'google' ? 'Google' : 'Strava'}.`)
  if (!u || !(await bcrypt.compare(String(b.password || ''), u.password_hash))) throw new HttpError(401, 'E-mail ou senha incorretos')
  attempts.delete(email)
  const token = await newSession(u.id)
  send(res, 200, { user: publicUser(u) }, { 'Set-Cookie': sessionCookie(req, token, SESSION_DAYS * 86400) })
})

route('POST', '/api/auth/logout', async (req, res) => {
  const sid = cookies(req).sid
  if (sid) await q('delete from sessions where token = $1', [sid])
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) })
})

route('GET', '/api/me', async (req, res) => {
  const u = await requireUser(req, { approved: false })
  send(res, 200, { user: { ...publicUser(u), strava: !!u.strava_id, google: !!u.google_sub, provider: u.provider } })
})

route('DELETE', '/api/me/strava', async (req, res) => {
  const u = await requireUser(req)
  if (u.provider === 'strava') throw new HttpError(400, 'Sua conta foi criada pelo Strava, então ele não pode ser desconectado.')
  await q('update users set strava_id = null where id = $1', [u.id])
  await q('delete from strava_tokens where user_id = $1', [u.id])
  send(res, 200, { ok: true })
})

// ---------- agenda ----------
route('POST', '/api/calendar/test', async (req, res) => {
  await requireUser(req)
  const { url } = await readJson(req)
  try {
    const clean = normalizeUrl(url)
    const events = await eventsFor(clean)
    send(res, 200, { url: clean, events })
  } catch (e) {
    throw new HttpError(400, e.message)
  }
})

route('GET', '/api/calendar', async (req, res) => {
  const u = await requireUser(req)
  const r = await q(`select data->'profile'->>'icalUrl' as url from app_state where user_id = $1`, [u.id])
  const url = r.rows[0]?.url
  if (!url) return send(res, 200, { events: [] })
  try {
    send(res, 200, { events: await eventsFor(url) })
  } catch (e) {
    send(res, 200, { events: [], error: e.message })
  }
})

route('PUT', '/api/me/avatar', async (req, res) => {
  const u = await requireUser(req, { approved: false })
  const a = parseAvatar((await readJson(req)).avatar)
  await q('update users set avatar = $1, avatar_type = $2 where id = $3', [a?.buf || null, a?.type || null, u.id])
  send(res, 200, { ok: true })
})

route('GET', '/api/avatar/:id', async (req, res, p) => {
  const me = await requireUser(req, { approved: false })
  if (String(me.id) !== p.id && me.role !== 'admin' && !(me.status === 'approved' && (await canSeeAvatar(me.id, Number(p.id))))) throw new HttpError(403, 'Sem acesso')
  const r = await q('select avatar, avatar_type from users where id = $1', [p.id])
  const a = r.rows[0]
  if (!a?.avatar) throw new HttpError(404, 'Sem foto')
  res.writeHead(200, { 'Content-Type': a.avatar_type, 'Cache-Control': 'private, max-age=300' })
  res.end(a.avatar)
})

route('POST', '/api/ping', async (req, res) => {
  const u = await requireUser(req, { approved: false })
  const b = await readJson(req)
  await q('update users set last_seen_at = now(), lang = coalesce($2, lang), tz = coalesce($3, tz) where id = $1', [u.id, b.lang || null, b.tz || null])
  if (u.status === 'approved') {
    await q(`insert into activity (user_id, day) values ($1, (now() at time zone coalesce($2, 'America/Sao_Paulo'))::date)
             on conflict (user_id, day) do update set hits = activity.hits + 1`, [u.id, b.tz || u.tz])
  }
  send(res, 200, { ok: true })
})

route('GET', '/api/state', async (req, res) => {
  const u = await requireUser(req)
  const r = await q('select data, updated_at from app_state where user_id = $1', [u.id])
  send(res, 200, r.rows[0] ? { data: r.rows[0].data, updatedAt: r.rows[0].updated_at } : { data: null })
})

route('PUT', '/api/state', async (req, res) => {
  const u = await requireUser(req)
  const b = await readJson(req)
  if (!b.data || typeof b.data !== 'object') throw new HttpError(400, 'Dados inválidos')
  await q(
    `insert into app_state (user_id, data, schedule, updated_at) values ($1, $2, $3, now())
     on conflict (user_id) do update set data = excluded.data, schedule = excluded.schedule, updated_at = now()`,
    [u.id, b.data, JSON.stringify(Array.isArray(b.schedule) ? b.schedule.slice(0, 600) : [])],
  )
  send(res, 200, { ok: true })
})

// leitura de PDF (dieta / treino): no máximo 15 por pessoa por dia
const planUses = new Map()
route('GET', '/api/plan/ready', async (req, res) => send(res, 200, { ready: planReady() }))
route('POST', '/api/plan/parse', async (req, res) => {
  const u = await requireUser(req)
  if (!planReady()) throw new HttpError(503, 'Leitura de PDF ainda não configurada')
  const b = await readJson(req, 14_000_000)
  if (!['diet', 'workout', 'routine'].includes(b.kind)) throw new HttpError(400, 'Tipo inválido')
  const pdf = typeof b.pdf === 'string' ? b.pdf.replace(/^data:application\/pdf;base64,/, '') : ''
  if (!pdf || !Buffer.from(pdf.slice(0, 8), 'base64').toString('latin1').startsWith('%PDF')) throw new HttpError(400, 'Arquivo não é PDF')
  const day = new Date().toISOString().slice(0, 10)
  const key = `${u.id}:${day}`
  const used = planUses.get(key) || 0
  if (used >= 15) throw new HttpError(429, 'Limite de leituras de hoje atingido. Tente amanhã.')
  planUses.set(key, used + 1)
  try {
    send(res, 200, await parsePlan(b.kind, pdf, ['pt', 'en', 'es'].includes(b.lang) ? b.lang : 'pt'))
  } catch (e) {
    console.error('plan parse', e)
    throw new HttpError(502, 'Não consegui ler o PDF agora. Tente de novo.')
  }
})

registerSocial({ route, send, readJson, requireUser, HttpError })

route('GET', '/api/push/key', async (req, res) => send(res, 200, { key: vapidPublicKey() }))

route('POST', '/api/push/subscribe', async (req, res) => {
  const u = await requireUser(req, { approved: false })
  const s = (await readJson(req)).subscription
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) throw new HttpError(400, 'Inscrição inválida')
  await q(
    `insert into push_subs (user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)
     on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [u.id, s.endpoint, s.keys.p256dh, s.keys.auth],
  )
  send(res, 200, { ok: true })
})

route('POST', '/api/push/test', async (req, res) => {
  const u = await requireUser(req, { approved: false })
  const b = await readJson(req)
  const ok = await sendToUser(u.id, { title: String(b.title || 'Dont Sorry IA').slice(0, 80), body: String(b.body || 'Notificação de teste.').slice(0, 300), kind: 'teste' })
  send(res, 200, { ok })
})

// ---------- admin ----------
route('GET', '/api/admin/users', async (req, res) => {
  await requireAdmin(req)
  const r = await q(`
    select u.id, u.name, u.email, u.provider, u.status, u.role, u.notif_paused, u.created_at, u.approved_at, u.last_seen_at, (u.avatar_type is not null) as has_avatar,
      (select count(*) from activity a where a.user_id = u.id and a.day > current_date - 30)::int as days30,
      (select count(*) from push_subs p where p.user_id = u.id)::int as devices
    from users u order by (u.status = 'pending') desc, u.created_at desc`)
  send(res, 200, { users: r.rows })
})

route('POST', '/api/admin/users/:id/:action', async (req, res, p) => {
  const admin = await requireAdmin(req)
  const id = Number(p.id)
  const actions = {
    approve: `update users set status = 'approved', approved_at = now() where id = $1`,
    reject: `update users set status = 'rejected' where id = $1`,
    pause: `update users set notif_paused = true where id = $1`,
    unpause: `update users set notif_paused = false where id = $1`,
    delete: `delete from users where id = $1 and role <> 'admin'`,
  }
  if (!actions[p.action]) throw new HttpError(404, 'Ação desconhecida')
  if (id === admin.id && p.action !== 'pause' && p.action !== 'unpause') throw new HttpError(400, 'Você não pode fazer isso com a sua própria conta')
  await q(actions[p.action], [id])
  if (p.action === 'approve') sendToUser(id, { title: 'Acesso liberado', body: 'Sua conta foi aprovada. Abra o app e comece o dia 1.', kind: 'admin' }).catch(() => {})
  send(res, 200, { ok: true })
})

route('GET', '/api/admin/stats', async (req, res) => {
  await requireAdmin(req)
  const [tot, dau, wau, mau, sent] = await Promise.all([
    q(`select count(*) filter (where status = 'approved')::int as approved, count(*) filter (where status = 'pending')::int as pending,
              count(*) filter (where status = 'rejected')::int as rejected, count(*)::int as total from users`),
    q(`select d::date::text as day, (select count(*) from activity a where a.day = d::date)::int as n
       from generate_series(current_date - 29, current_date, interval '1 day') d order by d`),
    q(`select w::date::text as week, (select count(distinct user_id) from activity a where a.day >= w::date and a.day < w::date + 7)::int as n
       from generate_series(date_trunc('week', current_date) - interval '11 weeks', date_trunc('week', current_date), interval '1 week') w order by w`),
    q(`select m::date::text as month, (select count(distinct user_id) from activity a where a.day >= m::date and a.day < (m + interval '1 month')::date)::int as n
       from generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month') m order by m`),
    q(`select count(*) filter (where sent_at > now() - interval '1 day')::int as day, count(*) filter (where sent_at > now() - interval '7 days')::int as week from notif_log where ok`),
  ])
  send(res, 200, { totals: tot.rows[0], daily: dau.rows, weekly: wau.rows, monthly: mau.rows, sent: sent.rows[0] })
})

route('GET', '/api/admin/notifications', async (req, res) => {
  await requireAdmin(req)
  const [cfg, br, log, by] = await Promise.all([
    getSetting('notifications', { enabled: true }),
    q('select * from broadcasts order by coalesce(sent_at, send_at) desc limit 20'),
    q(`select l.kind, l.title, l.body, l.ok, l.sent_at, u.name from notif_log l left join users u on u.id = l.user_id order by l.sent_at desc limit 50`),
    q(`select kind, count(*)::int as n from notif_log where ok and sent_at > now() - interval '7 days' group by kind`),
  ])
  send(res, 200, { settings: cfg, broadcasts: br.rows, log: log.rows, byKind: by.rows })
})

route('PUT', '/api/admin/notifications', async (req, res) => {
  await requireAdmin(req)
  const b = await readJson(req)
  await setSetting('notifications', { enabled: !!b.enabled })
  send(res, 200, { ok: true })
})

route('POST', '/api/admin/broadcasts', async (req, res) => {
  await requireAdmin(req)
  const b = await readJson(req)
  const title = String(b.title || '').trim().slice(0, 80)
  const body = String(b.body || '').trim().slice(0, 300)
  if (!title || !body) throw new HttpError(400, 'Escreva o título e a mensagem')
  const when = b.sendAt ? new Date(b.sendAt) : new Date()
  if (Number.isNaN(when.getTime())) throw new HttpError(400, 'Data inválida')
  const r = await q('insert into broadcasts (title, body, send_at) values ($1, $2, $3) returning *', [title, body, when])
  send(res, 201, { broadcast: r.rows[0] })
})

route('DELETE', '/api/admin/broadcasts/:id', async (req, res, p) => {
  await requireAdmin(req)
  await q('delete from broadcasts where id = $1 and sent_at is null', [Number(p.id)])
  send(res, 200, { ok: true })
})

// ---------- arquivos do app ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.jpg': 'image/jpeg' }
async function serveStatic(req, res, pathname) {
  let file = join(DIST, normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, ''))
  if (!file.startsWith(DIST)) file = join(DIST, 'index.html')
  let s = await stat(file).catch(() => null)
  if (s?.isDirectory()) {
    file = join(file, 'index.html')
    s = await stat(file).catch(() => null)
  }
  if (!s) file = join(DIST, 'index.html')
  const ext = extname(file)
  const cache = ext === '.html' || file.endsWith('sw.js') || ext === '.webmanifest' ? 'no-cache' : 'public, max-age=31536000, immutable'
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache })
  res.end(await readFile(file))
}

/** Conta de admin fixa: ADMIN_EMAIL + ADMIN_PASSWORD_HASH (hash bcrypt) nas variáveis do Railway. */
async function ensureAdmin() {
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!ADMIN_EMAIL) return
  // só o e-mail de ADMIN_EMAIL é admin: contas que viraram admin antes (ex.: a primeira criada) voltam a ser usuário
  const demoted = await q(`update users set role = 'user' where role = 'admin' and email <> $1 returning email`, [ADMIN_EMAIL])
  if (demoted.rows.length) console.log(`admin: ${demoted.rows.length} conta(s) deixaram de ser admin`)
  const r = await q('select id from users where email = $1', [ADMIN_EMAIL])
  if (r.rows.length) {
    await q(`update users set role = 'admin', status = 'approved', approved_at = coalesce(approved_at, now()) where id = $1`, [r.rows[0].id])
    console.log('admin: conta já existe, garantido como admin')
  } else if (hash) {
    await q(`insert into users (email, name, password_hash, status, role, approved_at) values ($1, 'Admin', $2, 'approved', 'admin', now())`, [ADMIN_EMAIL, hash])
    console.log('admin: conta criada')
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://x')
  try {
    if (url.pathname.startsWith('/api/')) {
      for (const r of routes) {
        const m = r.method === req.method && r.re.exec(url.pathname)
        if (m) return await r.fn(req, res, m.groups || {})
      }
      throw new HttpError(404, 'Rota não encontrada')
    }
    await serveStatic(req, res, url.pathname)
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e)
    if (!res.headersSent) send(res, e.status || 500, { error: e instanceof HttpError ? e.message : 'Erro no servidor' })
  }
})

await migrate()
await migrateSocial()
await ensureAdmin()
await initPush()
startScheduler()
startRankScheduler()
server.listen(PORT, () => console.log(`Dont Sorry IA no ar na porta ${PORT}`))
