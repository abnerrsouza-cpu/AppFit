import { useCallback, useEffect, useState } from 'react'
import { type AdminNotifs, type AdminStats, type AdminUser, api, avatarUrl, showEmail } from '../api'
import { Icon } from '../components/Icon'
import { Info, WithInfo } from '../components/Info'

// Painel do administrador (só aparece para a conta admin). Textos em português.
type Sec = 'solicitacoes' | 'usuarios' | 'frequencia' | 'notificacoes'

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—')
const fmtDateTime = (s: string | null) => (s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—')
function ago(s: string | null) {
  if (!s) return 'nunca entrou'
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 2) return 'agora'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

export function Admin({ onPending, onBack }: { onPending: (n: number) => void; onBack?: () => void }) {
  const [sec, setSec] = useState<Sec>('solicitacoes')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [err, setErr] = useState('')
  const load = useCallback(() => {
    api.admin
      .users()
      .then((r) => {
        setUsers(r.users)
        onPending(r.users.filter((u) => u.status === 'pending').length)
      })
      .catch((e) => setErr(e.message))
  }, [onPending])
  useEffect(load, [load])

  const pending = users.filter((u) => u.status === 'pending')
  const act = async (id: number, a: Parameters<typeof api.admin.act>[1]) => {
    try {
      await api.admin.act(id, a)
      load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="screen">
      {onBack && (
        <div className="sheet-h">
          <button type="button" className="round-btn" onClick={onBack} aria-label="Voltar">
            <Icon name="back" />
          </button>
          <span className="eyebrow">Perfil</span>
        </div>
      )}
      <header className="page-h">
        <h1 className="ttl">
          Admin
          <Info text="Painel do administrador: aprove novas contas, acompanhe o uso do app e controle as notificações." />
        </h1>
      </header>
      <div className="cat-row">
        {(
          [
            ['solicitacoes', `Solicitações${pending.length ? ` (${pending.length})` : ''}`],
            ['usuarios', 'Usuários'],
            ['frequencia', 'Frequência'],
            ['notificacoes', 'Notificações'],
          ] as [Sec, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" className={`cat ${sec === id ? 'on' : ''}`} onClick={() => setSec(id)}>
            {label}
          </button>
        ))}
      </div>
      {err && <p className="form-err">{err}</p>}

      {sec === 'solicitacoes' && (
        <section className="adm-list">
          <p className="ttl hint">
            Novas solicitações de acesso
            <Info text="Pessoas que criaram conta e esperam a sua aprovação. Aprovar libera o app e envia um aviso no celular da pessoa." />
          </p>
          {pending.length === 0 && <p className="muted center-txt">Nenhuma solicitação pendente.</p>}
          {pending.map((u) => (
            <div key={u.id} className="card adm-user">
              <UserHead u={u} sub={`Pediu acesso em ${fmtDateTime(u.created_at)}`} />
              <div className="row2">
                <button type="button" className="danger-btn" onClick={() => act(u.id, 'reject')}>
                  Recusar
                </button>
                <button type="button" className="cta" onClick={() => act(u.id, 'approve')}>
                  Aprovar
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {sec === 'usuarios' && (
        <section className="adm-list">
          <p className="ttl hint">
            Todos os usuários ({users.length})
            <Info text="Lista de contas. Dias ativos conta em quantos dos últimos 30 dias a pessoa abriu o app. Aparelhos é quantos celulares recebem notificação." />
          </p>
          {users.map((u) => (
            <div key={u.id} className="card adm-user">
              <UserHead u={u} sub={`Último acesso: ${ago(u.last_seen_at)}`} />
              <div className="adm-meta">
                <span>
                  <b>{u.days30}</b> dias ativos (30d)
                </span>
                <span>
                  <b>{u.devices}</b> aparelho{u.devices === 1 ? '' : 's'}
                </span>
                <span>desde {fmtDate(u.approved_at || u.created_at)}</span>
              </div>
              {u.role !== 'admin' && (
                <div className="adm-actions">
                  {u.status === 'pending' && (
                    <button type="button" className="chip on" onClick={() => act(u.id, 'approve')}>
                      Aprovar
                    </button>
                  )}
                  {u.status === 'rejected' && (
                    <button type="button" className="chip" onClick={() => act(u.id, 'approve')}>
                      Aprovar mesmo assim
                    </button>
                  )}
                  {u.status === 'approved' && (
                    <button type="button" className="chip" onClick={() => act(u.id, u.notif_paused ? 'unpause' : 'pause')}>
                      {u.notif_paused ? 'Retomar notificações' : 'Pausar notificações'}
                    </button>
                  )}
                  {u.status === 'approved' && (
                    <button type="button" className="chip" onClick={() => act(u.id, 'reject')}>
                      Bloquear acesso
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {sec === 'frequencia' && <Frequencia />}
      {sec === 'notificacoes' && <Notificacoes />}
    </div>
  )
}

function UserHead({ u, sub }: { u: AdminUser; sub: string }) {
  const chip = { pending: ['Aguardando', 'warn'], approved: ['Ativo', 'ok'], rejected: ['Bloqueado', 'bad'] }[u.status]
  return (
    <div className="adm-head">
      <span className="avatar sm">{u.has_avatar ? <img src={avatarUrl(u.id)} alt="" /> : u.name.slice(0, 1).toUpperCase()}</span>
      <span className="adm-name">
        <b>
          {u.name} {u.role === 'admin' && <em className="adm-chip">admin</em>}
        </b>
        <small>
          {showEmail(u.email)}
          {u.provider !== 'senha' && ` · via ${u.provider === 'google' ? 'Google' : 'Strava'}`}
        </small>
        <small>{sub}</small>
      </span>
      <span className={`adm-status ${chip[1]}`}>{u.notif_paused && u.status === 'approved' ? 'Pausado' : chip[0]}</span>
    </div>
  )
}

function Bars({ data, label }: { data: { k: string; n: number }[]; label: (k: string) => string }) {
  const max = Math.max(1, ...data.map((d) => d.n))
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div className="abars">
      <div className="abars-plot">
        {data.map((d, i) => (
          <button
            key={d.k}
            type="button"
            className="abars-col"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onClick={() => setHover(hover === i ? null : i)}
            aria-label={`${label(d.k)}: ${d.n} usuários`}
          >
            <span className="abars-bar" style={{ height: `${Math.max(2, (d.n / max) * 100)}%` }} />
            {hover === i && (
              <span className="wb-tip">
                <b>{d.n}</b> usuários
                <small>{label(d.k)}</small>
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="abars-axis">
        <span>{label(data[0]?.k || '')}</span>
        <span>{label(data[data.length - 1]?.k || '')}</span>
      </div>
    </div>
  )
}

const dmy = (s: string) => {
  const [y, m, d] = s.split('-')
  return `${d}/${m}${y ? '' : ''}`
}
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function Frequencia() {
  const [st, setSt] = useState<AdminStats | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    api.admin.stats().then(setSt).catch((e) => setErr(e.message))
  }, [])
  if (err) return <p className="form-err">{err}</p>
  if (!st) return <p className="muted center-txt">Carregando…</p>
  const today = st.daily[st.daily.length - 1]?.n ?? 0
  const week = st.weekly[st.weekly.length - 1]?.n ?? 0
  const month = st.monthly[st.monthly.length - 1]?.n ?? 0
  return (
    <section className="adm-list">
      <div className="grid2">
        <div className="card tile">
          <span className="tile-h">Usuários ativos</span>
          <b className="tile-n">{st.totals.approved}</b>
          <span className="tile-s">{st.totals.pending} aguardando aprovação</span>
        </div>
        <div className="card tile">
          <span className="tile-h">Abriram hoje</span>
          <b className="tile-n">{today}</b>
          <span className="tile-s">
            {week} na semana · {month} no mês
          </span>
        </div>
        <div className="card tile">
          <span className="tile-h">Notificações enviadas</span>
          <b className="tile-n">{st.sent.day}</b>
          <span className="tile-s">{st.sent.week} nos últimos 7 dias</span>
        </div>
        <div className="card tile">
          <span className="tile-h">Uso no mês</span>
          <b className="tile-n">{st.totals.approved ? Math.round((month / st.totals.approved) * 100) : 0}%</b>
          <span className="tile-s">dos ativos abriram o app</span>
        </div>
      </div>
      <div className="card block">
        <h2 className="ttl">
          Por dia
          <Info text="Quantas pessoas diferentes abriram o app em cada um dos últimos 30 dias." />
        </h2>
        <Bars data={st.daily.map((d) => ({ k: d.day, n: d.n }))} label={dmy} />
      </div>
      <div className="card block">
        <h2 className="ttl">
          Por semana
          <Info text="Quantas pessoas diferentes abriram o app em cada semana (segunda a domingo), nas últimas 12 semanas." />
        </h2>
        <Bars data={st.weekly.map((d) => ({ k: d.week, n: d.n }))} label={(k) => `sem. ${dmy(k)}`} />
      </div>
      <div className="card block">
        <h2 className="ttl">
          Por mês
          <Info text="Quantas pessoas diferentes abriram o app em cada mês, nos últimos 6 meses." />
        </h2>
        <Bars data={st.monthly.map((d) => ({ k: d.month, n: d.n }))} label={(k) => MONTHS[Number(k.split('-')[1]) - 1] || k} />
      </div>
    </section>
  )
}

const KIND: Record<string, string> = { rotina: 'Rotina', broadcast: 'Aviso geral', admin: 'Sistema', teste: 'Teste' }

function Notificacoes() {
  const [d, setD] = useState<AdminNotifs | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [when, setWhen] = useState('')
  const [msg, setMsg] = useState('')
  const load = () => api.admin.notifications().then(setD).catch((e) => setMsg(e.message))
  useEffect(() => {
    load()
  }, [])
  if (!d) return <p className="muted center-txt">{msg || 'Carregando…'}</p>
  const toggle = async () => {
    await api.admin.setEnabled(!d.settings.enabled)
    load()
  }
  const sendB = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.admin.broadcast(title, body, when ? new Date(when).toISOString() : undefined)
      setTitle('')
      setBody('')
      setWhen('')
      setMsg(when ? 'Aviso agendado.' : 'Aviso enviado para a fila. Sai em até 1 minuto.')
      load()
    } catch (ex) {
      setMsg((ex as Error).message)
    }
  }
  return (
    <section className="adm-list">
      <div className={`card test-mode ${d.settings.enabled ? '' : 'off-all'}`}>
        <div>
          <b className="ttl">
            Cobranças automáticas {d.settings.enabled ? 'ligadas' : 'desligadas'}
            <Info text="Liga ou desliga todas as cobranças da rotina (refeições, treino, prestação de contas) para todos os usuários. Avisos gerais continuam saindo." />
          </b>
          <small>{d.settings.enabled ? 'Todos os usuários recebem as cobranças nos horários da rotina.' : 'Ninguém recebe cobranças da rotina agora.'}</small>
        </div>
        <button type="button" className={`switch ${d.settings.enabled ? 'on' : ''}`} aria-pressed={d.settings.enabled} aria-label="Cobranças automáticas" onClick={toggle}>
          <i />
        </button>
      </div>

      <div className="grid2">
        {['rotina', 'broadcast', 'admin', 'teste'].map((k) => (
          <div key={k} className="card tile">
            <span className="tile-h">{KIND[k]}</span>
            <b className="tile-n">{d.byKind.find((x) => x.kind === k)?.n ?? 0}</b>
            <span className="tile-s">enviadas em 7 dias</span>
          </div>
        ))}
      </div>

      <form className="card field" onSubmit={sendB}>
        <b className="ttl">
          Enviar aviso para todos
          <Info text="Manda uma notificação para todos os usuários ativos. Deixe a data vazia para enviar agora, ou escolha dia e hora para agendar." />
        </b>
        <input id="adm-b-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título. Ex.: Desafio de sábado" maxLength={80} />
        <textarea id="adm-b-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mensagem. Ex.: Quem treinar hoje e prestar contas ganha destaque." maxLength={300} />
        <label>
          Agendar para (opcional)
          <input id="adm-b-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <WithInfo text="Coloca o aviso na fila. Sem data, sai em até 1 minuto.">
          <button type="submit" className="cta" disabled={!title.trim() || !body.trim()}>
            <Icon name="bell" size={18} /> {when ? 'Agendar aviso' : 'Enviar agora'}
          </button>
        </WithInfo>
        {msg && <p className="hint">{msg}</p>}
      </form>

      {d.broadcasts.length > 0 && (
        <div className="card block">
          <h2 className="ttl">
            Avisos
            <Info text="Avisos enviados e agendados. Agendados ainda podem ser cancelados." />
          </h2>
          <ul className="adm-log">
            {d.broadcasts.map((b) => (
              <li key={b.id}>
                <span>
                  <b>{b.title}</b>
                  <small>{b.body}</small>
                  <small>{b.sent_at ? `Enviado ${fmtDateTime(b.sent_at)} para ${b.sent_count} pessoa${b.sent_count === 1 ? '' : 's'}` : `Agendado para ${fmtDateTime(b.send_at)}`}</small>
                </span>
                {!b.sent_at && (
                  <button type="button" className="chip" onClick={() => api.admin.cancelBroadcast(b.id).then(load)}>
                    Cancelar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card block">
        <h2 className="ttl">
          Últimos envios
          <Info text="As 50 notificações mais recentes. Falhou significa que a pessoa não tem aparelho cadastrado ou desativou as notificações." />
        </h2>
        {d.log.length === 0 && <p className="muted">Nenhum envio ainda.</p>}
        <ul className="adm-log">
          {d.log.map((l, i) => (
            <li key={i}>
              <span>
                <b>
                  {l.title} <em className={`adm-chip ${l.ok ? 'ok' : 'bad'}`}>{l.ok ? 'entregue' : 'falhou'}</em>
                </b>
                <small>{l.body}</small>
                <small>
                  {KIND[l.kind] || l.kind} · {l.name || '—'} · {fmtDateTime(l.sent_at)}
                </small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
