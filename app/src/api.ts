// Comunicação com o servidor. Se não houver servidor (ex.: versão no GitHub Pages),
// o app funciona no modo local, sem login, como antes.

export interface User {
  id: number
  name: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  role: 'user' | 'admin'
  hasAvatar: boolean
  notifPaused: boolean
  strava?: boolean
  google?: boolean
  provider?: 'senha' | 'google' | 'strava'
}

export class ApiError extends Error {
  status: number
  constructor(status: number, msg: string) {
    super(msg)
    this.status = status
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let r: Response
  try {
    r = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Sem conexão. Confira sua internet.')
  }
  const isJson = (r.headers.get('content-type') || '').includes('application/json')
  if (!isJson) throw new ApiError(r.status === 200 ? -1 : r.status, 'Servidor indisponível')
  const data = await r.json()
  if (!r.ok) throw new ApiError(r.status, data.error || 'Erro')
  return data as T
}

export type Boot = { mode: 'local' } | { mode: 'server'; user: User | null }

/** Descobre se há servidor e quem está logado. */
export async function boot(): Promise<Boot> {
  try {
    const { user } = await call<{ user: User }>('GET', '/api/me')
    return { mode: 'server', user }
  } catch (e) {
    const err = e as ApiError
    if (err.status === 401) return { mode: 'server', user: null }
    if (err.status === 0) {
      // sem internet: se já houve login neste aparelho, segue com os dados locais
      return { mode: 'local' }
    }
    return { mode: 'local' }
  }
}

const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/Sao_Paulo'
  }
}

export const api = {
  signup: (b: { name: string; email: string; password: string; avatar?: string; lang: string }) => call<{ user: User }>('POST', '/api/auth/signup', { ...b, tz: tz() }),
  login: (email: string, password: string) => call<{ user: User }>('POST', '/api/auth/login', { email, password }),
  logout: () => call('POST', '/api/auth/logout'),
  me: () => call<{ user: User }>('GET', '/api/me'),
  setAvatar: (avatar: string | null) => call('PUT', '/api/me/avatar', { avatar }),
  ping: (lang: string) => call('POST', '/api/ping', { lang, tz: tz() }),
  getState: () => call<{ data: unknown | null }>('GET', '/api/state'),
  putState: (data: unknown, schedule: unknown[]) => call('PUT', '/api/state', { data, schedule }),
  calendarTest: (url: string) => call<{ url: string; events: CalEvent[] }>('POST', '/api/calendar/test', { url }),
  calendar: () => call<{ events: CalEvent[]; error?: string }>('GET', '/api/calendar'),
  disconnectStrava: () => call('DELETE', '/api/me/strava'),
  pushKey: () => call<{ key: string }>('GET', '/api/push/key'),
  pushSubscribe: (subscription: PushSubscriptionJSON) => call('POST', '/api/push/subscribe', { subscription }),
  pushTest: (title: string, body: string) => call<{ ok: boolean }>('POST', '/api/push/test', { title, body }),
  admin: {
    users: () => call<{ users: AdminUser[] }>('GET', '/api/admin/users'),
    act: (id: number, action: 'approve' | 'reject' | 'pause' | 'unpause' | 'delete') => call('POST', `/api/admin/users/${id}/${action}`),
    stats: () => call<AdminStats>('GET', '/api/admin/stats'),
    notifications: () => call<AdminNotifs>('GET', '/api/admin/notifications'),
    setEnabled: (enabled: boolean) => call('PUT', '/api/admin/notifications', { enabled }),
    broadcast: (title: string, body: string, sendAt?: string) => call('POST', '/api/admin/broadcasts', { title, body, sendAt }),
    cancelBroadcast: (id: number) => call('DELETE', `/api/admin/broadcasts/${id}`),
  },
}

export const avatarUrl = (id: number, v = 0) => `/api/avatar/${id}?v=${v}`

export interface AdminUser {
  id: number
  name: string
  email: string
  provider: 'senha' | 'google' | 'strava'
  status: User['status']
  role: User['role']
  notif_paused: boolean
  created_at: string
  approved_at: string | null
  last_seen_at: string | null
  has_avatar: boolean
  days30: number
  devices: number
}
export interface AdminStats {
  totals: { approved: number; pending: number; rejected: number; total: number }
  daily: { day: string; n: number }[]
  weekly: { week: string; n: number }[]
  monthly: { month: string; n: number }[]
  sent: { day: number; week: number }
}
export interface AdminNotifs {
  settings: { enabled: boolean }
  broadcasts: { id: number; title: string; body: string; send_at: string; sent_at: string | null; sent_count: number }[]
  log: { kind: string; title: string; body: string; ok: boolean; sent_at: string; name: string | null }[]
  byKind: { kind: string; n: number }[]
}

/** E-mails de contas Strava são internos: mostra 'Conta Strava' no lugar. */
export const showEmail = (e: string) => (e.endsWith('@strava.invalid') ? 'Conta Strava' : e)

export interface CalEvent {
  uid: string
  title: string
  start: string
  end: string | null
  allDay: boolean
}
