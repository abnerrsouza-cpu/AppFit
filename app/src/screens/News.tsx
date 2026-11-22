import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { ARTICLES, type Article, CATS, CAT_STYLE, CHANNELS, VIDEOS, yt } from '../content'

const VIDEO_GRADS = [
  'linear-gradient(140deg,#1f6feb,#0a3d9e)',
  'linear-gradient(140deg,#0ea5e9,#1e40af)',
  'linear-gradient(140deg,#10b981,#065f46)',
  'linear-gradient(140deg,#6366f1,#312e81)',
  'linear-gradient(140deg,#f59e0b,#b45309)',
]
const VIDEO_EMOJI = ['🏋️', '💪', '🍱', '🔥', '🧘']

export function News() {
  const [cat, setCat] = useState<string>('tudo')
  const [open, setOpen] = useState<Article | null>(null)

  useEffect(() => {
    if (!open) window.scrollTo(0, 0)
  }, [open])

  if (open) return <Reader a={open} onBack={() => setOpen(null)} onOpen={setOpen} />

  const list = cat === 'tudo' ? ARTICLES : ARTICLES.filter((a) => a.cat === cat)
  const [hero, ...rest] = list
  const showVideos = cat === 'tudo' || cat === 'videos'

  return (
    <div className="screen">
      <header className="page-h">
        <span className="eyebrow">Notícias</span>
        <h1>Conteúdo para não parar</h1>
      </header>

      <div className="cat-row" role="tablist">
        {CATS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={`cat ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      {cat !== 'videos' && hero && (
        <button type="button" className="feat" style={{ background: CAT_STYLE[hero.cat].grad }} onClick={() => setOpen(hero)}>
          <span className="feat-emoji">{hero.emoji}</span>
          <span className="tag light">{CAT_STYLE[hero.cat].name}</span>
          <b>{hero.title}</b>
          <small>
            {hero.minutes} min de leitura · {hero.date}
          </small>
        </button>
      )}

      {showVideos && (
        <section className="rail-sec">
          <div className="rail-h">
            <h2 className="sec-title">Vídeos</h2>
            <small>abre no YouTube</small>
          </div>
          <div className={`rail ${cat === 'videos' ? 'rail-col' : ''}`}>
            {VIDEOS.map((v, i) => (
              <a key={v.title} className="vid" href={yt(v.query)} target="_blank" rel="noreferrer">
                <span className="vid-cover" style={{ background: VIDEO_GRADS[i % VIDEO_GRADS.length] }}>
                  <span className="vid-emoji">{VIDEO_EMOJI[i % VIDEO_EMOJI.length]}</span>
                  <span className="play">
                    <Icon name="play" size={20} />
                  </span>
                  <span className="vid-dur">{v.minutes}</span>
                </span>
                <b>{v.title}</b>
                <small>{v.tag}</small>
              </a>
            ))}
          </div>
        </section>
      )}

      {cat !== 'videos' && rest.length > 0 && (
        <section className="art-list">
          {rest.map((a) => (
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
      )}

      {(cat === 'tudo' || cat === 'videos') && (
        <section className="rail-sec">
          <div className="rail-h">
            <h2 className="sec-title">Canais para seguir</h2>
          </div>
          <div className="rail">
            {CHANNELS.map((c, i) => (
              <a key={c.name} className="chan" href={yt(c.query)} target="_blank" rel="noreferrer">
                <span className="chan-av" style={{ background: VIDEO_GRADS[i % VIDEO_GRADS.length] }}>
                  {c.name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')}
                </span>
                <b>{c.name}</b>
                <small>{c.about}</small>
                <span className="chan-btn">
                  <Icon name="play" size={12} /> Ver canal
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Reader({ a, onBack, onOpen }: { a: Article; onBack: () => void; onOpen: (a: Article) => void }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [a.id])
  const more = ARTICLES.filter((x) => x.id !== a.id && x.cat === a.cat).concat(ARTICLES.filter((x) => x.id !== a.id && x.cat !== a.cat)).slice(0, 2)
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
        <small className="muted">
          {a.minutes} min de leitura · {a.date}
        </small>
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
