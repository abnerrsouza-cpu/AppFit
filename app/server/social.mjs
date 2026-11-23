// Ranking: amigos (por link de convite), grupos com nome e ranking geral.
// Os pontos são calculados aqui no servidor a partir dos dados salvos de cada pessoa
// (as mesmas regras do app), então ninguém consegue inventar pontos pelo celular.
// Do outro, só aparecem nome, foto de perfil, nível, pontos da semana e sequência.
import { randomBytes } from 'node:crypto'
import { getSetting, q } from './db.mjs'
import { sendToUser } from './push.mjs'

export async function migrateSocial() {
  await q(`
    alter table users add column if not exists invite_code text unique;
    alter table users add column if not exists ranking_public boolean not null default true;
    create table if not exists friendships (
      user_a int not null references users(id) on delete cascade,
      user_b int not null references users(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (user_a, user_b),
      check (user_a < user_b)
    );
    create table if not exists groups (
      id serial primary key,
      name text not null,
      code text unique not null,
      owner_id int references users(id) on delete set null,
      created_at timestamptz not null default now()
    );
    create table if not exists group_members (
      group_id int not null references groups(id) on delete cascade,
      user_id int not null references users(id) on delete cascade,
      joined_at timestamptz not null default now(),
      primary key (group_id, user_id)
    );
    create table if not exists rank_state (
      user_id int primary key references users(id) on delete cascade,
      week text not null,
      behind int[] not null default '{}'
    );
  `)
}

// ---------- datas no fuso da pessoa ----------
function localParts(tz) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date())
  const g = (t) => p.find((x) => x.type === t)?.value
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: Number(g('hour')), dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')) }
}
const addDays = (ymd, n) => {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const mondayOf = (ymd) => addDays(ymd, -((new Date(ymd + 'T12:00:00Z').getUTCDay() + 6) % 7))

// ---------- pontos (mesmas regras de src/game.ts) ----------
const XP = { task: 10, checkin: 50, trained: 20, weekly: 100, photo: 30, promise: 20, goal: 50 }
const LEVELS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500]

/** Pontos da semana (segunda a domingo), total, nível e sequência. `weekOffset` = -1 para a semana passada. */
export function score(data, tz, weekOffset = 0) {
  const today = localParts(tz).date
  const ws = addDays(mondayOf(today), 7 * weekOffset)
  const we = weekOffset === 0 ? today : addDays(ws, 6)
  const inWeek = (k) => k >= ws && k <= we
  let week = 0
  let total = 0
  const add = (v, k) => {
    total += v
    if (inWeek(k)) week += v
  }
  const d = data || {}
  for (const [k, l] of Object.entries(d.daily || {})) add(XP.checkin + (l?.trained === 'sim' ? XP.trained : 0), k)
  for (const [k, day] of Object.entries(d.checks || {})) add(Math.min(100, Object.values(day || {}).filter(Boolean).length * XP.task), k)
  for (const [k, w] of Object.entries(d.weekly || {})) {
    const v = XP.weekly + (w?.photoId ? XP.photo : 0)
    total += v
    if (k === ws) week += v
  }
  const pj = d.projeto || {}
  for (const p of pj.promises || []) if (p.status === 'cumprida') add(XP.promise, p.date || '')
  for (const g of pj.goals || []) if (g.done) total += XP.goal

  // sequência: noites seguidas com prestação de contas, terminando hoje ou ontem
  let streak = 0
  let day = d.daily?.[today] ? today : addDays(today, -1)
  while (d.daily?.[day]) {
    streak++
    day = addDays(day, -1)
  }
  let lv = 0
  while (lv + 1 < LEVELS.length && total >= LEVELS[lv + 1]) lv++
  return { week, total, level: lv + 1, streak, weekStart: ws }
}

const shortName = (n) => {
  const parts = String(n || '').trim().split(/\s+/)
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || '?'
}

/** Monta o ranking de uma lista de pessoas. */
async function board(ids, meId, { short = false, weekOffset = 0 } = {}) {
  if (!ids.length) return []
  const r = await q(
    `select u.id, u.name, u.tz, u.avatar_type is not null as has_avatar, s.data
     from users u left join app_state s on s.user_id = u.id
     where u.id = any($1) and u.status = 'approved'`,
    [ids],
  )
  const rows = r.rows.map((u) => {
    const sc = score(u.data, u.tz, weekOffset)
    return { id: u.id, name: short && u.id !== meId ? shortName(u.name) : u.name, hasAvatar: u.has_avatar, points: sc.week, level: sc.level, streak: sc.streak, me: u.id === meId }
  })
  rows.sort((a, b) => b.points - a.points || b.streak - a.streak || a.id - b.id)
  rows.forEach((x, i) => (x.pos = i + 1))
  return rows
}

async function friendIds(uid) {
  const r = await q(`select case when user_a = $1 then user_b else user_a end as id from friendships where user_a = $1 or user_b = $1`, [uid])
  return r.rows.map((x) => x.id)
}
async function inviteCode(u) {
  if (u.invite_code) return u.invite_code
  for (;;) {
    const code = randomBytes(5).toString('base64url').replace(/[-_]/g, 'x').slice(0, 7).toUpperCase()
    const r = await q('update users set invite_code = $1 where id = $2 and invite_code is null returning invite_code', [code, u.id]).catch(() => null)
    if (r?.rows.length) return code
    const again = await q('select invite_code from users where id = $1', [u.id])
    if (again.rows[0]?.invite_code) return again.rows[0].invite_code
  }
}
const newGroupCode = () => 'G' + randomBytes(4).toString('base64url').replace(/[-_]/g, 'x').slice(0, 6).toUpperCase()

/** Pode ver a foto de perfil? Amigo, colega de grupo ou quem aparece no ranking geral. */
export async function canSeeAvatar(meId, id) {
  const r = await q(
    `select 1 from users u where u.id = $2 and u.status = 'approved' and (
       u.ranking_public
       or exists (select 1 from friendships f where (f.user_a = least($1::int, $2::int) and f.user_b = greatest($1::int, $2::int)))
       or exists (select 1 from group_members a join group_members b on a.group_id = b.group_id where a.user_id = $1 and b.user_id = $2)
     )`,
    [meId, id],
  )
  return r.rows.length > 0
}

// ---------- rotas ----------
export function registerSocial({ route, send, readJson, requireUser, HttpError }) {
  route('GET', '/api/social', async (req, res) => {
    const u = await requireUser(req)
    const code = await inviteCode(u)
    const fr = await board(await friendIds(u.id), u.id)
    const g = await q(
      `select g.id, g.name, g.code, g.owner_id = $1 as mine, (select count(*)::int from group_members m where m.group_id = g.id) as members
       from groups g join group_members gm on gm.group_id = g.id where gm.user_id = $1 order by g.created_at`,
      [u.id],
    )
    send(res, 200, { inviteCode: code, friends: fr.length, groups: g.rows, public: u.ranking_public })
  })

  route('GET', '/api/ranking', async (req, res) => {
    const u = await requireUser(req)
    const scope = new URL(req.url, 'http://x').searchParams.get('scope') || 'friends'
    let rows
    if (scope === 'friends') rows = await board([u.id, ...(await friendIds(u.id))], u.id)
    else if (scope === 'global') {
      const r = await q(`select id from users where status = 'approved' and (ranking_public or id = $1)`, [u.id])
      rows = await board(r.rows.map((x) => x.id), u.id, { short: true })
      const me = rows.find((x) => x.me)
      const top = rows.slice(0, 50)
      return send(res, 200, { rows: me && me.pos > 50 ? [...top, me] : top, total: rows.length })
    } else if (scope.startsWith('group:')) {
      const gid = Number(scope.slice(6))
      const ok = await q('select 1 from group_members where group_id = $1 and user_id = $2', [gid, u.id])
      if (!ok.rows.length) throw new HttpError(403, 'Você não está nesse grupo')
      const m = await q('select user_id from group_members where group_id = $1', [gid])
      rows = await board(m.rows.map((x) => x.user_id), u.id)
    } else throw new HttpError(400, 'Ranking inválido')
    send(res, 200, { rows, total: rows.length })
  })

  route('POST', '/api/friends/join', async (req, res) => {
    const u = await requireUser(req)
    const code = String((await readJson(req)).code || '').trim().toUpperCase()
    const r = await q(`select id, name from users where invite_code = $1 and status = 'approved'`, [code])
    const f = r.rows[0]
    if (!f) throw new HttpError(404, 'Convite inválido')
    if (f.id === u.id) throw new HttpError(400, 'Esse é o seu próprio convite')
    await q('insert into friendships (user_a, user_b) values ($1, $2) on conflict do nothing', [Math.min(u.id, f.id), Math.max(u.id, f.id)])
    send(res, 200, { ok: true, name: f.name })
  })

  route('DELETE', '/api/friends/:id', async (req, res, p) => {
    const u = await requireUser(req)
    const id = Number(p.id)
    await q('delete from friendships where user_a = $1 and user_b = $2', [Math.min(u.id, id), Math.max(u.id, id)])
    send(res, 200, { ok: true })
  })

  route('POST', '/api/groups', async (req, res) => {
    const u = await requireUser(req)
    const name = String((await readJson(req)).name || '').trim().slice(0, 40)
    if (!name) throw new HttpError(400, 'Dê um nome ao grupo')
    const n = await q('select count(*)::int as n from group_members where user_id = $1', [u.id])
    if (n.rows[0].n >= 10) throw new HttpError(400, 'Você pode estar em no máximo 10 grupos')
    const g = await q('insert into groups (name, code, owner_id) values ($1, $2, $3) returning id, name, code', [name, newGroupCode(), u.id])
    await q('insert into group_members (group_id, user_id) values ($1, $2)', [g.rows[0].id, u.id])
    send(res, 200, { group: g.rows[0] })
  })

  route('POST', '/api/groups/join', async (req, res) => {
    const u = await requireUser(req)
    const code = String((await readJson(req)).code || '').trim().toUpperCase()
    const g = (await q('select id, name from groups where code = $1', [code])).rows[0]
    if (!g) throw new HttpError(404, 'Grupo não encontrado')
    const n = await q('select count(*)::int as n from group_members where group_id = $1', [g.id])
    if (n.rows[0].n >= 50) throw new HttpError(400, 'Esse grupo está cheio')
    await q('insert into group_members (group_id, user_id) values ($1, $2) on conflict do nothing', [g.id, u.id])
    send(res, 200, { ok: true, group: g })
  })

  route('DELETE', '/api/groups/:id', async (req, res, p) => {
    const u = await requireUser(req)
    await q('delete from group_members where group_id = $1 and user_id = $2', [Number(p.id), u.id])
    await q('delete from groups g where id = $1 and not exists (select 1 from group_members m where m.group_id = g.id)', [Number(p.id)])
    send(res, 200, { ok: true })
  })

  route('PUT', '/api/me/ranking', async (req, res) => {
    const u = await requireUser(req)
    const pub = !!(await readJson(req)).public
    await q('update users set ranking_public = $1 where id = $2', [pub, u.id])
    send(res, 200, { ok: true, public: pub })
  })
}

// ---------- avisos do ranking (a cada 15 min) ----------
const MSG = {
  pass: {
    pt: (n, d) => [`${n} passou você no ranking`, `Faltam ${d} pontos para recuperar o lugar. Bora?`],
    en: (n, d) => [`${n} just passed you in the ranking`, `${d} points to take your spot back. Let's go?`],
    es: (n, d) => [`${n} te pasó en el ranking`, `Faltan ${d} puntos para recuperar tu lugar. ¿Vamos?`],
  },
  sunday: {
    pt: (p, d) => [`Últimas horas da semana`, p === 1 ? `Você está em 1º. Preste contas hoje e segure a liderança.` : `Você está em ${p}º, a ${d} pontos do 1º. Ainda dá tempo.`],
    en: (p, d) => [`Last hours of the week`, p === 1 ? `You're 1st. Report in tonight and hold the lead.` : `You're #${p}, ${d} points behind 1st. There's still time.`],
    es: (p, d) => [`Últimas horas de la semana`, p === 1 ? `Estás en 1º. Rinde cuentas hoy y mantén el liderato.` : `Estás en ${p}º, a ${d} puntos del 1º. Aún hay tiempo.`],
  },
  monday: {
    pt: (c, pts, p) => [p === 1 ? `Você foi o campeão da semana!` : `Campeão da semana: ${c}`, p === 1 ? `${pts} pontos. Nova semana, tudo zerado. Defenda o título.` : `Você ficou em ${p}º. Nova semana começou, tudo zerado. É a sua vez.`],
    en: (c, pts, p) => [p === 1 ? `You were the champion of the week!` : `Champion of the week: ${c}`, p === 1 ? `${pts} points. New week, scores reset. Defend your title.` : `You finished #${p}. New week, scores reset. Your turn.`],
    es: (c, pts, p) => [p === 1 ? `¡Fuiste el campeón de la semana!` : `Campeón de la semana: ${c}`, p === 1 ? `${pts} puntos. Nueva semana, todo a cero. Defiende el título.` : `Quedaste en ${p}º. Nueva semana, todo a cero. Es tu turno.`],
  },
}
const pick = (m, lang) => m[lang] || m.pt

async function rankTick() {
  const cfg = await getSetting('notifications', { enabled: true })
  if (!cfg.enabled) return
  const users = await q(`
    select u.id, u.tz, u.lang from users u
    where u.status = 'approved' and u.notif_paused = false
      and exists (select 1 from push_subs p where p.user_id = u.id)
      and exists (select 1 from friendships f where f.user_a = u.id or f.user_b = u.id)`)
  for (const u of users.rows) {
    const now = localParts(u.tz)
    if (now.hour < 8 || now.hour >= 22) continue
    const ids = [u.id, ...(await friendIds(u.id))]
    const rows = await board(ids, u.id)
    const me = rows.find((x) => x.me)
    if (!me || rows.length < 2) continue
    const week = mondayOf(now.date)

    // alguém que estava atrás passou
    const behindNow = rows.filter((x) => x.pos > me.pos).map((x) => x.id)
    const prev = (await q('select week, behind from rank_state where user_id = $1', [u.id])).rows[0]
    if (prev?.week === week && me.points > 0) {
      const passer = rows.find((x) => x.pos < me.pos && prev.behind.includes(x.id))
      if (passer) {
        const [title, body] = pick(MSG.pass, u.lang)(passer.name.split(' ')[0], passer.points - me.points + 1)
        await sendToUser(u.id, { title, body, kind: 'ranking', dedupe: `pass-${week}-${passer.id}` })
      }
    }
    await q(`insert into rank_state (user_id, week, behind) values ($1, $2, $3) on conflict (user_id) do update set week = excluded.week, behind = excluded.behind`, [u.id, week, behindNow])

    // domingo à noite: últimas horas
    if (now.dow === 0 && now.hour >= 19) {
      const [title, body] = pick(MSG.sunday, u.lang)(me.pos, rows[0].points - me.points)
      await sendToUser(u.id, { title, body, kind: 'ranking', dedupe: `sun-${week}` })
    }
    // segunda de manhã: campeão da semana passada
    if (now.dow === 1 && now.hour >= 9) {
      const last = await board(ids, u.id, { weekOffset: -1 })
      const lme = last.find((x) => x.me)
      if (last[0]?.points > 0 && lme) {
        const [title, body] = pick(MSG.monday, u.lang)(last[0].name.split(' ')[0], last[0].points, lme.pos)
        await sendToUser(u.id, { title, body, kind: 'ranking', dedupe: `champ-${week}` })
      }
    }
  }
}

export function startRankScheduler() {
  const run = () => rankTick().catch((e) => console.error('ranking:', e.message))
  setTimeout(run, 20_000)
  return setInterval(run, 15 * 60_000)
}
