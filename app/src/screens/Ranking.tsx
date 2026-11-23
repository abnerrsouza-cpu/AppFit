// Ranking da semana: amigos, grupos e geral. Zera toda segunda.
import { useCallback, useEffect, useState } from 'react'
import { type RankRow, type SocialInfo, api, avatarUrl } from '../api'
import { Icon } from '../components/Icon'
import { Info } from '../components/Info'
import { LoginCta } from '../components/LoginCta'
import { t } from '../i18n'

type Scope = 'amigos' | 'grupos' | 'geral'

function shareLink(text: string, url: string) {
  const full = `${text} ${url}`
  if (navigator.share) return navigator.share({ text, url }).catch(() => {})
  window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank')
}

function Row({ r, leader }: { r: RankRow; leader?: RankRow }) {
  return (
    <li className={`rk-row ${r.me ? 'me' : ''} ${r.pos <= 3 ? `top${r.pos}` : ''}`}>
      <span className="rk-pos">{r.pos}</span>
      <span className="rk-av">{r.hasAvatar ? <img src={avatarUrl(r.id)} alt="" loading="lazy" /> : <b>{r.name.slice(0, 1).toUpperCase()}</b>}</span>
      <span className="rk-name">
        <b>{r.me ? t('Você') : r.name}</b>
        <small>
          {t('Nível {n}', { n: r.level })}
          {r.streak > 0 && (
            <>
              {' · '}
              <Icon name="flame" size={12} /> {r.streak === 1 ? t('1 dia') : t('{n} dias', { n: r.streak })}
            </>
          )}
        </small>
        {r.me && leader && leader.id !== r.id && <small className="rk-gap">{t('Faltam {n} pontos para o 1º lugar', { n: leader.points - r.points + 1 })}</small>}
      </span>
      <span className="rk-pts">
        <b>{r.points}</b>
        <small>{t('pts')}</small>
      </span>
    </li>
  )
}

function Board({ rows, total }: { rows: RankRow[]; total?: number }) {
  return (
    <>
      <ol className="rk-list card">
        {rows.flatMap((r, i) => [
          ...(i > 0 && r.pos - rows[i - 1].pos > 1 ? [<li key={`gap${r.id}`} className="rk-dots">···</li>] : []),
          <Row key={r.id} r={r} leader={rows[0]} />,
        ])}
      </ol>
      {total !== undefined && total > rows.length && <p className="muted center-txt">{t('{n} pessoas no ranking', { n: total })}</p>}
    </>
  )
}

function Steps({ list }: { list: string[] }) {
  return (
    <ol className="rk-steps">
      {list.map((x, i) => (
        <li key={i}>
          <span>{i + 1}</span>
          {x}
        </li>
      ))}
    </ol>
  )
}

export function Ranking({ online, onBack, notice }: { online: boolean; onBack?: () => void; notice?: string | null }) {
  const [scope, setScope] = useState<Scope>('amigos')
  const [info, setInfo] = useState<SocialInfo | null>(null)
  const [rows, setRows] = useState<RankRow[] | null>(null)
  const [total, setTotal] = useState<number>()
  const [gid, setGid] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState(notice || '')
  const [gname, setGname] = useState('')
  const [gcode, setGcode] = useState('')
  const [copied, setCopied] = useState(false)

  const loadInfo = useCallback(() => api.social().then(setInfo, (e) => setErr(t(e.message))), [])
  useEffect(() => {
    if (online) void loadInfo()
  }, [online, loadInfo])

  useEffect(() => {
    if (!online) return
    const sc = scope === 'amigos' ? 'friends' : scope === 'geral' ? 'global' : gid ? `group:${gid}` : null
    setRows(null)
    if (!sc) return
    let alive = true
    api.ranking(sc).then(
      (r) => {
        if (!alive) return
        setRows(r.rows)
        setTotal(r.total)
      },
      (e) => alive && setErr(t(e.message)),
    )
    return () => {
      alive = false
    }
  }, [online, scope, gid, info])

  useEffect(() => {
    if (scope === 'grupos' && !gid && info?.groups.length) setGid(info.groups[0].id)
  }, [scope, gid, info])

  const day = new Date().getDay()
  const left = (7 - day) % 7
  const ends = left === 0 ? t('Termina hoje à meia-noite.') : left === 1 ? t('Termina amanhã à meia-noite.') : t('Termina em {n} dias.', { n: left })

  if (!online)
    return (
      <div className="screen">
        <Head onBack={onBack} />
        <h1 className="ttl rk-title">{t('Ranking da semana')}</h1>
        <LoginCta title={t('Crie sua conta para entrar no ranking')} text={t('Dispute pontos com seus amigos toda semana. Quem cumprir mais fica em 1º.')} />
      </div>
    )

  const friendLink = info ? `${location.origin}/?amigo=${info.inviteCode}` : ''
  const inviteFriends = () => shareLink(t('Bora ver quem cumpre mais essa semana? Entra no Sem Desculpa pelo meu link:'), friendLink)
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sem permissão */
    }
  }
  const group = info?.groups.find((g) => g.id === gid)

  return (
    <div className="screen">
      <Head onBack={onBack} />
      <h1 className="ttl rk-title">
        {t('Ranking da semana')}
        <Info text={t('Quem cumprir mais na semana fica em 1º. Os pontos vêm das tarefas marcadas, da prestação de contas, do treino, da foto semanal e das promessas cumpridas. Zera toda segunda.')} />
      </h1>
      <p className="lead">
        {t('Zera toda segunda.')} {ends}
      </p>

      {msg && (
        <div className="rk-msg">
          <Icon name="check" size={16} stroke={3} /> {msg}
          <button type="button" className="link" onClick={() => setMsg('')} aria-label={t('Fechar')}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
      {err && <p className="rk-err">{err}</p>}

      <div className="seg-tabs three" role="tablist">
        {(['amigos', 'grupos', 'geral'] as Scope[]).map((x) => (
          <button key={x} type="button" role="tab" aria-selected={scope === x} className={scope === x ? 'on' : ''} onClick={() => setScope(x)}>
            {t({ amigos: 'Amigos', grupos: 'Grupos', geral: 'Geral' }[x])}
          </button>
        ))}
      </div>

      {scope === 'amigos' && info && (
        <>
          {info.friends === 0 ? (
            <section className="card rk-hero">
              <span className="rk-hero-ic">
                <Icon name="user" size={26} />
              </span>
              <b>{t('Chame seus amigos para disputar com você')}</b>
              <Steps list={[t('Toque em Convidar amigos.'), t('Mande o link no WhatsApp.'), t('Quando eles entrarem, vocês disputam pontos toda semana.')]} />
              <button type="button" className="cta" onClick={inviteFriends}>
                {t('Convidar amigos')}
              </button>
              <button type="button" className="link" onClick={() => copy(friendLink)}>
                {copied ? t('Link copiado') : t('Copiar link')}
              </button>
            </section>
          ) : (
            rows && <Board rows={rows} />
          )}
          {info.friends > 0 && (
            <button type="button" className="ghost-btn" onClick={inviteFriends}>
              <Icon name="plus" size={18} /> {t('Convidar mais amigos')}
            </button>
          )}
        </>
      )}

      {scope === 'grupos' && info && (
        <>
          {info.groups.length > 0 && (
            <div className="cat-row">
              {info.groups.map((g) => (
                <button key={g.id} type="button" className={`cat ${gid === g.id ? 'on' : ''}`} onClick={() => setGid(g.id)}>
                  {g.name} <small>· {g.members}</small>
                </button>
              ))}
            </div>
          )}
          {group && rows && <Board rows={rows} />}
          {group && (
            <div className="rk-group-actions">
              <button type="button" className="ghost-btn" onClick={() => shareLink(t('Entra no meu grupo "{g}" no Sem Desculpa e vamos ver quem cumpre mais:', { g: group.name }), `${location.origin}/?grupo=${group.code}`)}>
                <Icon name="plus" size={18} /> {t('Convidar para o grupo')}
              </button>
              <small className="muted">{t('Código do grupo: {c}', { c: group.code })}</small>
              <button
                type="button"
                className="link danger"
                onClick={async () => {
                  await api.leaveGroup(group.id)
                  setGid(null)
                  void loadInfo()
                }}
              >
                {t('Sair do grupo')}
              </button>
            </div>
          )}

          {info.groups.length === 0 && (
            <section className="card rk-hero">
              <span className="rk-hero-ic">
                <Icon name="list" size={24} />
              </span>
              <b>{t('Crie um grupo: academia, trabalho, família')}</b>
              <Steps list={[t('Escreva o nome do grupo e toque em Criar grupo.'), t('Toque em Convidar para o grupo e mande o link.'), t('Só quem está no grupo vê esse ranking.')]} />
            </section>
          )}
          <form
            className="card field rk-form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!gname.trim()) return
              try {
                const r = await api.createGroup(gname.trim())
                setGname('')
                setGid(r.group.id)
                await loadInfo()
              } catch (x) {
                setErr(t((x as Error).message))
              }
            }}
          >
            <label>
              {t('Nome do novo grupo')}
              <input id="rk-gname" value={gname} onChange={(e) => setGname(e.target.value)} placeholder={t('Ex.: Galera da academia')} maxLength={40} />
            </label>
            <button type="submit" className="cta sm-cta" disabled={!gname.trim()}>
              {t('Criar grupo')}
            </button>
          </form>
          <form
            className="card field rk-form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!gcode.trim()) return
              try {
                const r = await api.joinGroup(gcode.trim())
                setGcode('')
                setGid(r.group.id)
                setMsg(t('Você entrou no grupo {g}.', { g: r.group.name }))
                await loadInfo()
              } catch (x) {
                setErr(t((x as Error).message))
              }
            }}
          >
            <label>
              {t('Recebeu um código de grupo?')}
              <input id="rk-gcode" value={gcode} onChange={(e) => setGcode(e.target.value.toUpperCase())} placeholder="GAB12CD" maxLength={10} />
            </label>
            <button type="submit" className="ghost-btn" disabled={!gcode.trim()}>
              {t('Entrar no grupo')}
            </button>
          </form>
        </>
      )}

      {scope === 'geral' && info && (
        <>
          {rows && <Board rows={rows} total={total} />}
          <div className="card rk-public">
            <div>
              <b>{t('Aparecer no ranking geral')}</b>
              <small>{t('Os outros veem só seu primeiro nome, a inicial do sobrenome, sua foto de perfil e seus pontos.')}</small>
            </div>
            <button
              type="button"
              className={`switch ${info.public ? 'on' : ''}`}
              aria-pressed={info.public}
              aria-label={t('Aparecer no ranking geral')}
              onClick={async () => {
                await api.setRankingPublic(!info.public)
                await loadInfo()
              }}
            >
              <i />
            </button>
          </div>
        </>
      )}

      <p className="rk-foot">
        <Icon name="lock" size={14} /> {t('No ranking ninguém vê seu peso, medidas, fotos do corpo, dieta ou desabafos.')}
      </p>
    </div>
  )
}

function Head({ onBack }: { onBack?: () => void }) {
  return (
    <div className="sheet-h">
      {onBack && (
        <button type="button" className="round-btn" onClick={onBack} aria-label={t('Voltar')}>
          <Icon name="back" />
        </button>
      )}
      <span className="eyebrow">{t('Ranking')}</span>
    </div>
  )
}
