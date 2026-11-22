import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Info, WithInfo } from '../components/Info'
import { t } from '../i18n'
import { compress, getPhoto, putPhoto } from '../photos'
import {
  type AppState,
  type Goal,
  type Promise_,
  daysBetween,
  fmtDayMonth,
  getProjeto,
  newId,
  parseYmd,
  setProjeto,
  today,
} from '../store'

type Sec = 'expectativa' | 'promessas' | 'metas' | 'desabafo' | 'fotos'
const SECS: { id: Sec; label: string; emoji: string }[] = [
  { id: 'expectativa', label: 'Expectativa', emoji: '🌟' },
  { id: 'promessas', label: 'Promessas', emoji: '🤞' },
  { id: 'metas', label: 'Metas', emoji: '🎯' },
  { id: 'desabafo', label: 'Desabafo', emoji: '💬' },
  { id: 'fotos', label: 'Fotos', emoji: '📸' },
]

const dm = (s: string) => fmtDayMonth(parseYmd(s))

function usePhoto(id?: string) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let alive = true
    if (id) getPhoto(id).then((u) => alive && setUrl(u))
    else setUrl(undefined)
    return () => {
      alive = false
    }
  }, [id])
  return url
}

async function savePhoto(file?: File) {
  if (!file) return undefined
  const url = await compress(file, 1100)
  const id = newId()
  await putPhoto(id, url)
  return id
}

export function Projeto({ s }: { s: AppState }) {
  const pj = getProjeto(s)
  const [sec, setSec] = useState<Sec>('expectativa')
  const visionUrl = usePhoto(pj.vision.photoId)
  const left = Math.max(0, daysBetween(new Date(), parseYmd(pj.vision.targetDate)))
  const kept = pj.promises.filter((p) => p.status === 'cumprida').length
  const goalsDone = pj.goals.filter((g) => g.done).length

  return (
    <div className="screen">
      <header className="page-h">
        <h1 className="ttl">
          {t('Meu projetinho')}
          <Info text={t('Seu espaço pessoal do projeto: o resultado que você quer, suas promessas, metas, desabafos e fotos.')} />
        </h1>
      </header>

      <section className="pj-hero" style={visionUrl ? { backgroundImage: `linear-gradient(180deg, rgba(5,15,40,.15), rgba(5,15,40,.85)), url(${visionUrl})` } : undefined}>
        <span className="pj-count">
          <b>{left}</b> {t('dias')}
          <Info light text={t('Dias que faltam até a data da sua meta. Você define a data na aba Expectativa.')} />
        </span>
        <p className="pj-result">{pj.vision.result || t('Defina o resultado que você quer na aba Expectativa.')}</p>
        <div className="pj-stats">
          <span>🤞 {kept} {kept === 1 ? t('promessa cumprida') : t('promessas cumpridas')}</span>
          <span>
            🎯 {goalsDone}/{pj.goals.length} {t('metas')}
          </span>
        </div>
      </section>

      <p className="ttl hint">
        {t('Seções')}
        <Info text={t('Expectativa: o corpo que você quer. Promessas: compromissos para cumprir. Metas: objetivos com prazo. Desabafo: diário privado. Fotos: momentos do projeto.')} />
      </p>
      <div className="cat-row">
        {SECS.map((x) => (
          <button key={x.id} type="button" className={`cat ${sec === x.id ? 'on' : ''}`} onClick={() => setSec(x.id)}>
            <span>{x.emoji}</span> {t(x.label)}
          </button>
        ))}
      </div>

      {sec === 'expectativa' && <Expectativa s={s} visionUrl={visionUrl} />}
      {sec === 'promessas' && <Promessas s={s} />}
      {sec === 'metas' && <Metas s={s} />}
      {sec === 'desabafo' && <Desabafo s={s} />}
      {sec === 'fotos' && <Fotos s={s} />}
    </div>
  )
}

function Expectativa({ s, visionUrl }: { s: AppState; visionUrl?: string }) {
  const v = getProjeto(s).vision
  const upd = (patch: Partial<typeof v>) => setProjeto((p) => ({ ...p, vision: { ...p.vision, ...patch } }))
  const [busy, setBusy] = useState(false)
  return (
    <div className="pj-sec">
      <label className="card pj-photo">
        <input
          id="pj-vision-photo"
          type="file"
          accept="image/*"
          onChange={async (e) => {
            setBusy(true)
            const id = await savePhoto(e.target.files?.[0])
            if (id) upd({ photoId: id })
            setBusy(false)
          }}
        />
        {visionUrl ? (
          <img src={visionUrl} alt={t('Foto da expectativa')} />
        ) : (
          <span>
            <span className="big-emo">🖼️</span>
            <b className="ttl">
              {busy ? t('Salvando...') : t('Foto da expectativa')}
              <Info text={t('Uma imagem do resultado que você quer. Ela vira o fundo do topo do Projetinho, para você ver todo dia.')} />
            </b>
            <small>{t('O shape que você quer ter. Uma referência, um print, uma foto sua antiga.')}</small>
          </span>
        )}
        {visionUrl && <span className="pj-photo-tag">{t('Toque para trocar')}</span>}
      </label>

      <div className="card field">
        <label>
          <span className="ttl">
            🎯 {t('Resultado que eu quero (meu foco)')}
            <Info text={t('Escreva em uma frase o resultado que você quer. Aparece em destaque no topo da tela.')} />
          </span>
          <textarea id="pj-result" rows={2} value={v.result} onChange={(e) => upd({ result: e.target.value })} placeholder={t('Ex.: 80 kg, abdômen aparecendo')} />
        </label>
        <label>
          <span className="ttl">
            😌 {t('Como vou me sentir quando chegar lá')}
            <Info text={t('Imaginar o sentimento ajuda a não desistir. Escreva como você vai se sentir no dia que chegar.')} />
          </span>
          <textarea id="pj-feeling" rows={2} value={v.feeling} onChange={(e) => upd({ feeling: e.target.value })} placeholder={t('Ex.: confiante, leve, orgulhoso')} />
        </label>
        <label>
          <span className="ttl">
            ❤️ {t('Por que isso importa pra mim')}
            <Info text={t('O motivo verdadeiro. É ele que segura você nos dias sem vontade.')} />
          </span>
          <textarea id="pj-why" rows={2} value={v.why} onChange={(e) => upd({ why: e.target.value })} placeholder={t('O motivo real, sem filtro')} />
        </label>
        <label>
          <span className="ttl">
            📅 {t('Até quando')}
            <Info text={t('A data em que você quer chegar no resultado. A contagem de dias do topo usa essa data.')} />
          </span>
          <input id="pj-date" type="date" value={v.targetDate} onChange={(e) => upd({ targetDate: e.target.value })} />
        </label>
      </div>
    </div>
  )
}

function Promessas({ s }: { s: AppState }) {
  const list = getProjeto(s).promises
  const [text, setText] = useState('')
  const set = (id: string, status: Promise_['status']) =>
    setProjeto((p) => ({ ...p, promises: p.promises.map((x) => (x.id === id ? { ...x, status } : x)) }))
  return (
    <div className="pj-sec">
      <form
        className="card pj-add"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          setProjeto((p) => ({ ...p, promises: [{ id: newId(), text: text.trim(), date: today(), status: 'aberta' }, ...p.promises] }))
          setText('')
        }}
      >
        <span className="pj-add-pre">
          {t('Eu prometo que')}
          <Info text={t('Escreva um compromisso com você mesmo. Depois marque Cumpri ou Quebrei. Promessas cumpridas aparecem no topo.')} />
        </span>
        <textarea id="pj-new-promise" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('vou treinar amanhã mesmo cansado')} />
        <WithInfo text={t('Salva a promessa na lista abaixo com a data de hoje.')}>
          <button type="submit" className="cta sm-cta">
            {t('Fazer promessa')}
          </button>
        </WithInfo>
      </form>
      {list.map((p) => (
        <div key={p.id} className={`card promise is-${p.status}`}>
          <p>"{p.text}"</p>
          <small>{t('Prometido em {d}', { d: dm(p.date) })}</small>
          {p.status === 'aberta' ? (
            <div className="promise-actions">
              <button type="button" className="pa ok" title={t('Cumpri')} onClick={() => set(p.id, 'cumprida')}>
                <Icon name="check" size={16} stroke={3} /> {t('Cumpri')}
              </button>
              <button type="button" className="pa no" onClick={() => set(p.id, 'quebrada')}>
                <Icon name="x" size={16} stroke={3} /> {t('Quebrei')}
              </button>
            </div>
          ) : (
            <span className="promise-badge">{p.status === 'cumprida' ? `✅ ${t('Cumprida')}` : `💔 ${t('Quebrada. Recomece.')}`}</span>
          )}
        </div>
      ))}
    </div>
  )
}

const GOAL_EMOJI = ['🎯', '⚖️', '🏋️', '🏃', '🥗', '💧', '😴', '🔥']

function Metas({ s }: { s: AppState }) {
  const list = getProjeto(s).goals
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('🎯')
  const [due, setDue] = useState('')
  const done = list.filter((g) => g.done).length
  const toggle = (g: Goal) => setProjeto((p) => ({ ...p, goals: p.goals.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)) }))
  return (
    <div className="pj-sec">
      {list.length > 0 && (
        <div className="card pj-progress">
          <b>
            {t('{a} de {b} metas batidas', { a: done, b: list.length })}
          </b>
          <div className="meter meter-lg">
            <span style={{ width: `${(done / list.length) * 100}%` }} />
          </div>
        </div>
      )}
      {list
        .slice()
        .sort((a, b) => Number(a.done) - Number(b.done))
        .map((g) => {
          const d = g.due ? daysBetween(new Date(), parseYmd(g.due)) : null
          return (
            <div key={g.id} className={`card goal ${g.done ? 'is-done' : ''}`}>
              <span className="goal-emo">{g.emoji}</span>
              <span className="goal-txt">
                <b>{g.title}</b>
                {d !== null && <small>{g.done ? t('Batida!') : d >= 0 ? t('faltam {n} dias', { n: d }) : t('atrasada {n} dias', { n: -d })}</small>}
              </span>
              <button type="button" className={`tick ${g.done ? 'on' : ''}`} onClick={() => toggle(g)} aria-label={g.done ? t('Desmarcar meta') : t('Marcar meta como batida')}>
                {g.done && <Icon name="check" size={16} stroke={3} />}
              </button>
            </div>
          )
        })}
      <form
        className="card pj-add"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          setProjeto((p) => ({ ...p, goals: [...p.goals, { id: newId(), emoji, title: title.trim(), due, done: false }] }))
          setTitle('')
          setDue('')
        }}
      >
        <span className="pj-add-pre">
          {t('Nova meta')}
          <Info text={t('Crie um objetivo com prazo, como correr 5 km. Escolha um emoji, escreva a meta e a data. Marque o círculo quando bater.')} />
        </span>
        <div className="emo-pick">
          {GOAL_EMOJI.map((e) => (
            <button key={e} type="button" className={emoji === e ? 'on' : ''} onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
        <input id="pj-goal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Ex.: Fazer 10 barras seguidas')} />
        <label>
          {t('Prazo')}
          <input id="pj-goal-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <WithInfo text={t('Salva a meta na lista. O app mostra quantos dias faltam até o prazo.')}>
          <button type="submit" className="cta sm-cta">
            {t('Adicionar meta')}
          </button>
        </WithInfo>
      </form>
    </div>
  )
}

const MOODS = ['😫', '😤', '😔', '😐', '🙂', '💪']
const REPLY: Record<string, string> = {
  '😫': 'Dia pesado. Só não deixa ele virar dois. Amanhã a primeira refeição é a do plano.',
  '😤': 'Usa essa raiva no treino. Ela vira carga na barra.',
  '😔': 'Tá tudo bem não estar bem. Você escreveu, e isso já é não fugir.',
  '😐': 'Dia neutro também conta. Constância é feita de dias assim.',
  '🙂': 'Guarda esse sentimento. Ele é a prova de que está funcionando.',
  '💪': 'É isso. Lembra desse dia quando a vontade sumir.',
}

function Desabafo({ s }: { s: AppState }) {
  const list = getProjeto(s).vents
  const [mood, setMood] = useState('😐')
  const [text, setText] = useState('')
  const [reply, setReply] = useState<string | null>(null)
  return (
    <div className="pj-sec">
      <form
        className="card pj-add"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          setProjeto((p) => ({ ...p, vents: [{ id: newId(), date: today(), mood, text: text.trim() }, ...p.vents] }))
          setReply(t(REPLY[mood]))
          setText('')
        }}
      >
        <span className="pj-add-pre">
          <Icon name="lock" size={14} /> {t('Só você lê isso')}
          <Info text={t('Um diário privado. Escolha a carinha do seu humor e escreva o que está sentindo. O treinador responde na hora.')} />
        </span>
        <div className="emo-pick mood">
          {MOODS.map((m) => (
            <button key={m} type="button" className={mood === m ? 'on' : ''} onClick={() => setMood(m)}>
              {m}
            </button>
          ))}
        </div>
        <textarea id="pj-vent" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Fala o que tá pesando. Sem filtro.')} />
        <WithInfo text={t('Salva o desabafo com a data de hoje. Ninguém além de você vê.')}>
          <button type="submit" className="cta sm-cta">
            {t('Desabafar')}
          </button>
        </WithInfo>
      </form>
      {reply && (
        <div className="coach">
          <span className="coach-av">
            <Icon name="flame" size={20} />
          </span>
          <span className="coach-bubble">{reply}</span>
        </div>
      )}
      {list.map((v) => (
        <div key={v.id} className="card vent">
          <span className="vent-mood">{v.mood}</span>
          <div>
            <small>{dm(v.date)}</small>
            <p>{v.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Fotos({ s }: { s: AppState }) {
  const list = getProjeto(s).photos
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<string | null>(null)
  return (
    <div className="pj-sec">
      <label className="card pj-upload">
        <input
          id="pj-gallery"
          type="file"
          accept="image/*"
          onChange={async (e) => {
            setBusy(true)
            const id = await savePhoto(e.target.files?.[0])
            if (id) setProjeto((p) => ({ ...p, photos: [{ id: newId(), photoId: id, caption: '', date: today() }, ...p.photos] }))
            setBusy(false)
            e.target.value = ''
          }}
        />
        <Icon name="camera" size={22} /> {busy ? t('Salvando...') : t('Adicionar foto')}
        <Info text={t('Guarde qualquer momento do projeto: treino, prato, espelho. Toque numa foto para ver em tela cheia.')} />
      </label>
      {list.length === 0 ? (
        <p className="muted center-txt">{t('Treino, prato, espelho, conquista. Guarde aqui os momentos do projeto.')}</p>
      ) : (
        <div className="gallery">
          {list.map((p) => (
            <Thumb key={p.id} photoId={p.photoId} date={p.date} onOpen={setView} />
          ))}
        </div>
      )}
      {view && (
        <button type="button" className="lightbox" onClick={() => setView(null)} aria-label={t('Fechar foto')}>
          <img src={view} alt="" />
        </button>
      )}
    </div>
  )
}

function Thumb({ photoId, date, onOpen }: { photoId: string; date: string; onOpen: (u: string) => void }) {
  const url = usePhoto(photoId)
  return (
    <button type="button" className="thumb" onClick={() => url && onOpen(url)}>
      {url && <img src={url} alt="" />}
      <small>{dm(date)}</small>
    </button>
  )
}
