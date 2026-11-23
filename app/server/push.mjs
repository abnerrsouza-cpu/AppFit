// Notificações push (chegam com o app fechado) e o agendador que roda a cada minuto.
import * as webpush from 'web-push'
import { getSetting, q, setSetting } from './db.mjs'

let publicKey = ''

export async function initPush() {
  let keys = process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE ? { publicKey: process.env.VAPID_PUBLIC, privateKey: process.env.VAPID_PRIVATE } : await getSetting('vapid', null)
  if (!keys) {
    keys = webpush.generateVAPIDKeys() // gera uma vez e guarda no banco
    await setSetting('vapid', keys)
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@dontsorry.app', keys.publicKey, keys.privateKey)
  publicKey = keys.publicKey
}
export const vapidPublicKey = () => publicKey

/** Envia para todos os aparelhos do usuário. Com `dedupe`, nunca envia a mesma coisa duas vezes. */
export async function sendToUser(userId, { title, body, kind, dedupe = null }) {
  const ins = await q(
    `insert into notif_log (user_id, kind, dedupe, title, body, ok) values ($1, $2, $3, $4, $5, false)
     on conflict do nothing returning id`,
    [userId, kind, dedupe, title, body],
  )
  if (!ins.rows.length) return false // já enviado
  const subs = await q('select id, endpoint, p256dh, auth from push_subs where user_id = $1', [userId])
  let ok = false
  for (const s of subs.rows) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body }), { TTL: 3600 })
      ok = true
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await q('delete from push_subs where id = $1', [s.id]) // aparelho saiu
    }
  }
  await q('update notif_log set ok = $1 where id = $2', [ok, ins.rows[0].id])
  return ok
}

export async function notifyAdmins(title, body) {
  const r = await q(`select id from users where role = 'admin'`)
  for (const u of r.rows) await sendToUser(u.id, { title, body, kind: 'admin' })
}

// ---------- agendador ----------
function localNow(tz) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const g = (t) => parts.find((p) => p.type === t)?.value
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${g('hour')}:${g('minute')}` }
}
const minutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

async function tick() {
  // 1) avisos do admin agendados ou imediatos (saem mesmo com a rotina desligada)
  const due = await q(`select * from broadcasts where sent_at is null and send_at <= now() order by send_at limit 5`)
  for (const b of due.rows) {
    await q('update broadcasts set sent_at = now() where id = $1', [b.id])
    const users = await q(`select id from users u where status = 'approved' and notif_paused = false and exists (select 1 from push_subs p where p.user_id = u.id)`)
    let n = 0
    for (const u of users.rows) if (await sendToUser(u.id, { title: b.title, body: b.body, kind: 'broadcast', dedupe: `b${b.id}` })) n++
    await q('update broadcasts set sent_count = $1 where id = $2', [n, b.id])
  }

  // 2) cobranças da rotina de cada pessoa
  const cfg = await getSetting('notifications', { enabled: true })
  if (!cfg.enabled) return
  const rows = await q(`
    select u.id, u.tz, s.schedule, s.data
    from users u join app_state s on s.user_id = u.id
    where u.status = 'approved' and u.notif_paused = false
      and exists (select 1 from push_subs p where p.user_id = u.id)`)
  for (const r of rows.rows) {
    const now = localNow(r.tz)
    const nowMin = minutes(now.time)
    const reported = !!r.data?.daily?.[now.date]
    for (const n of r.schedule || []) {
      if (n.date !== now.date) continue
      const diff = nowMin - minutes(n.time)
      if (diff < 0 || diff > 10) continue // só o que venceu nos últimos 10 minutos
      if (reported && (n.moment === 'checkin' || n.moment === 'checkin_atrasado')) continue
      await sendToUser(r.id, { title: n.title, body: n.body, kind: 'rotina', dedupe: `${n.date}@${n.time}@${n.moment}` })
    }
  }
}

export function startScheduler() {
  const run = () => tick().catch((e) => console.error('agendador:', e.message))
  setTimeout(run, 5000)
  return setInterval(run, 60_000)
}
