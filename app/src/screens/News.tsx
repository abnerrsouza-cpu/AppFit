import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { ARTICLES, type Article, CATS, CAT_STYLE } from '../content'
import { type LiveVideo, ago, thumb, useLiveContent } from '../live'

type Mode = 'videos' | 'artigos'

export function News() {
  const live = useLiveContent()
  const [mode, setMode] = useState<Mode>('videos')
  const [channel, setChannel] = useState('todos')
  const [cat, setCat] = useState('tudo')
  const [open, setOpen] = useState<Article | null>(null)

  useEffect(() => {
    if (!open) window.scrollTo(0, 0)
  }, [open, mode])

  if (open) return <Reader a={open} onBack={() => setOpen(null)} onOpen={setOpen} />

  const vids = channel === 'todos' ? live.videos : live.videos.filter((v) => v.channel === channel)
  const [top, ...more] = vids
  const arts = cat === 'tudo' ? ARTICLES : ARTICLES.filter((a) => a.cat === cat)

  return (
    <div className="screen">
      <header className="page-h">
        <h1>Conteúdo</h1>
      </header>

      <div className="seg-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'videos'} className={mode === 'videos' ? 'on' : ''} onClick={() => setMode('videos')}>
          <Icon name="play" size={16} /> Vídeos
        </button>
        <button type="button" role="tab" aria-selected={mode === 'artigos'} className={mode === 'artigos' ? 'on' : ''} onClick={() => setMode('artigos')}>
          <Icon name="news" size={16} /> Artigos
        </button>
      </div>

      {mode === 'videos' && (
        <>
          <div className="cat-row">
            {['todos', ...live.channels.map((c) => c.name)].map((n) => (
              <button key={n} type="button" className={`cat ${channel === n ? 'on' : ''}`} onClick={() => setChannel(n)}>
                {n === 'todos' ? 'Todos' : n}
              </button>
            ))}
          </div>

          {top && <VideoCard v={top} big />}
          <div className="vgrid">
            {more.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
          <p className="foot-note center">
            <Icon name="refresh" size={14} /> Atualizado {ago(live.updatedAt)} · novos vídeos chegam todo dia
          </p>
        </>
      )}

      {mode === 'artigos' && (
        <>
          <div className="cat-row">
            {CATS.filter((c) => c.id !== 'videos').map((c) => (
              <button key={c.id} type="button" className={`cat ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
          <section className="art-list">
            {arts.map((a) => (
              <button key={a.id} type="button" className="card art" onClick={() => setOpen(a)}>
                <span className="art-cover" style={{ background: CAT_STYLE[a.cat].grad }}>
                  {a.emoji}
                </span>
                <span className="art-txt">
                  <span className="tag">{CAT_STYLE[a.cat].name}</span>
                  <b>{a.title}</b>
                  <small>{a.minutes} min de leitura</small>
                </span>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  )
}

function VideoCard({ v, big = false }: { v: LiveVideo; big?: boolean }) {
  const [broken, setBroken] = useState(false)
  return (
    <a className={`vcard ${big ? 'big' : ''}`} href={v.url} target="_blank" rel="noreferrer">
      <span className="vthumb">
        {!broken && <img src={thumb(v.id)} alt="" loading="lazy" onError={() => setBroken(true)} />}
        {broken && <span className="vthumb-fallback">▶</span>}
        <span className="play">
          <Icon name="play" size={big ? 22 : 16} />
        </span>
        <span className="vbadges">
          {v.short && <i>Short</i>}
          {v.lang === 'en' && <i>EN</i>}
        </span>
      </span>
      <b>{v.title.replace(/#\S+/g, '').trim()}</b>
      <small>
        {v.channel} · {ago(v.published)}
      </small>
    </a>
  )
}

function Reader({ a, onBack, onOpen }: { a: Article; onBack: () => void; onOpen: (a: Article) => void }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [a.id])
  const more = ARTICLES.filter((x) => x.id !== a.id && x.cat === a.cat)
    .concat(ARTICLES.filter((x) => x.id !== a.id && x.cat !== a.cat))
    .slice(0, 2)
  return (
    <div className="reader">
      <div className="reader-cover" style={{ background: CAT_STYLE[a.cat].grad }}>
        <button type="button" className="round-btn glass-btn" onClick={onBack} aria-label="Voltar">
          <Icon name="back" />
        </button>
        <span className="reader-emoji">{a.emoji}</span>
      </div>
      <article className="reader-body">
        <span className="tag">{CAT_STYLE[a.cat].name}</span>
        <h1>{a.title}</h1>
        <small className="muted">{a.minutes} min de leitura</small>
        {a.body.map((b, i) => (
          <div key={i} className="para">
            {b.h && <h2>{b.h}</h2>}
            <p>{b.p}</p>
          </div>
        ))}
        <aside className="takeaway">
          <b>Leve pro seu dia</b>
          <ul>
            {a.takeaway.map((t) => (
              <li key={t}>
                <Icon name="check" size={16} stroke={3} /> {t}
              </li>
            ))}
          </ul>
        </aside>
        <p className="disclaimer">Conteúdo informativo. Para dieta e treino individualizados, procure nutricionista e profissional de educação física.</p>
        <h2 className="sec-title">Leia também</h2>
        <div className="art-list">
          {more.map((m) => (
            <button key={m.id} type="button" className="card art" onClick={() => onOpen(m)}>
              <span className="art-cover" style={{ background: CAT_STYLE[m.cat].grad }}>
                {m.emoji}
              </span>
              <span className="art-txt">
                <span className="tag">{CAT_STYLE[m.cat].name}</span>
                <b>{m.title}</b>
              </span>
            </button>
          ))}
        </div>
      </article>
    </div>
  )
}
