import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { PhotoButtons } from '../components/PhotoButtons'
import { Celebrate } from '../components/Celebrate'
import { toast } from '../components/Toast'
import { ProjetoFunnel } from './ProjetoFunnel'
import { Info, WithInfo } from '../components/Info'
import { t } from '../i18n'
import { type PjStep, projetoTodo } from '../game'
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

export type Sec = 'expectativa' | 'promessas' | 'metas' | 'desabafo' | 'fotos'

/** Rola até o campo, destaca e (se for texto) já deixa o cursor nele. */
function focusField(id: string) {
  setTimeout(() => {
    const el = document.getElementById(id)
    if (!el) return
    const box = (el.closest('.pj-step, .card') as HTMLElement | null) ?? el
    box.scrollIntoView({ behavior: 'smooth', block: 'center' })
    box.classList.remove('pj-flash')
    void box.offsetWidth
    box.classList.add('pj-flash')
    if (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type !== 'file')) el.focus({ preventScroll: true })
  }, 120)
}

/** Passo a passo numerado, em linguagem simples. */
function Guide({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="guide">
      <b>{title}</b>
      <ol>
        {steps.map((x, i) => (
          <li key={i}>
            <span>{i + 1}</span>
            {x}
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Exemplos prontos: tocar preenche o campo. */
function Examples({ list, onPick }: { list: string[]; onPick: (x: string) => void }) {
  return (
    <div className="examples">
      <small>{t('Sem ideia? Toque num exemplo:')}</small>
      <div>
        {list.map((x) => (
          <button key={x} type="button" className="ex-chip" onClick={() => onPick(t(x))}>
            {t(x)}
          </button>
        ))}
      </div>
    </div>
  )
}
const SECS: { id: Sec; label: string; emoji: string }[] = [
  { id: 'expectativa', label: 'Expectativa', emoji: '' },
  { id: 'promessas', label: 'Promessas', emoji: '' },
  { id: 'metas', label: 'Metas', emoji: '' },
  { id: 'desabafo', label: 'Desabafo', emoji: '' },
  { id: 'fotos', label: 'Fotos', emoji: '' },
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

export function Projeto({ s, initialSec }: { s: AppState; initialSec?: Sec }) {
  const pj = getProjeto(s)
  const todo = projetoTodo(s)
  const [sec, setSec] = useState<Sec>(() => initialSec ?? SECS.find((x) => todo.count[x.id] > 0)?.id ?? 'expectativa')
  const next = todo.steps[0]
  const started = !!pj.startedAt
  const [funnel, setFunnel] = useState(false)
  const [party, setParty] = useState(false)
  const go = (st: PjStep) => {
    setSec(st.sec)
    focusField(st.target)
  }
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
        <p className="pj-result">{pj.vision.result || t('Seu projetinho está vazio. Vamos montar juntos?')}</p>
        {started && <span className="pj-started">{t('Dia {n} do projetinho', { n: Math.max(1, daysBetween(new Date(pj.startedAt!), new Date()) + 1) })}</span>}
        <div className="pj-stats">
          <span>{kept === 1 ? t('1 promessa cumprida') : t('{n} promessas cumpridas', { n: kept })}</span>
          <span>{t('{a} de {b} metas batidas', { a: goalsDone, b: pj.goals.length })}</span>
        </div>
      </section>

      {funnel && (
        <ProjetoFunnel
          s={s}
          name={s.profile.name}
          onClose={() => setFunnel(false)}
          onDone={() => {
            setFunnel(false)
            setParty(true)
            window.scrollTo(0, 0)
          }}
        />
      )}
      {party && (
        <Celebrate
          kind="level"
          icon="flame"
          kicker={t('Projetinho começou')}
          title={t('Dia 1. Sem desculpa.')}
          desc={t('Faltam {n} dias para "{r}". Volte amanhã para dizer se cumpriu sua promessa.', { n: left, r: pj.vision.result })}
          button={t('Bora')}
          onClose={() => setParty(false)}
        />
      )}

      {!started ? (
        <section className="card start-card">
          <span className="start-ic">
            <Icon name="flame" size={26} />
          </span>
          <b>{t('Seu projetinho ainda não começou')}</b>
          <p>{t('Responda 10 perguntas rápidas, faça o juramento de sinceridade e comece. Leva uns 3 minutos.')}</p>
          <button type="button" className="cta funnel-go" onClick={() => setFunnel(true)}>
            {t('Começar projetinho')} <Icon name="arrow" size={18} />
          </button>
        </section>
      ) : next ? (
        <section className="card next-step">
          <span className="next-eyebrow">
            <i>{todo.total}</i> {todo.total === 1 ? t('coisa para fazer aqui') : t('coisas para fazer aqui')}
          </span>
          <small className="next-lbl">{t('Próximo passo')}</small>
          <b>{next.title}</b>
          <p>{next.why}</p>
          <button type="button" className="cta" onClick={() => go(next)}>
            {t('Fazer agora')} <Icon name="arrow" size={18} />
          </button>
        </section>
      ) : (
        <section className="card next-step done">
          <b>
            <Icon name="check" size={20} stroke={3} /> {t('Tudo em dia no seu projetinho.')}
          </b>
          <p>{t('Volte amanhã para fazer uma nova promessa e contar como foi o dia.')}</p>
        </section>
      )}

      <p className="ttl hint">
        {t('Seções')}
        <Info text={t('Expectativa: o corpo que você quer. Promessas: compromissos para cumprir. Metas: objetivos com prazo. Desabafo: diário privado. Fotos: momentos do projeto.')} />
      </p>
      <div className="cat-row">
        {SECS.map((x) => (
          <button key={x.id} type="button" className={`cat ${sec === x.id ? 'on' : ''}`} onClick={() => setSec(x.id)}>
            {t(x.label)}
            {todo.count[x.id] > 0 ? <i className="cat-badge">{todo.count[x.id]}</i> : <i className="cat-ok"><Icon name="check" size={11} stroke={3.4} /></i>}
          </button>
        ))}
      </div>

      {sec === 'expectativa' && <Expectativa s={s} visionUrl={visionUrl} nextId={next?.sec === 'expectativa' ? next.target : undefined} />}
      {sec === 'promessas' && <Promessas s={s} />}
      {sec === 'metas' && <Metas s={s} />}
      {sec === 'desabafo' && <Desabafo s={s} />}
      {sec === 'fotos' && <Fotos s={s} />}
    </div>
  )
}

function Num({ n, done }: { n: number; done: boolean }) {
  return <span className={`pj-num ${done ? 'is-done' : ''}`}>{done ? <Icon name="check" size={14} stroke={3.2} /> : n}</span>
}

function Expectativa({ s, visionUrl, nextId }: { s: AppState; visionUrl?: string; nextId?: string }) {
  const v = getProjeto(s).vision
  const upd = (patch: Partial<typeof v>) => setProjeto((p) => ({ ...p, vision: { ...p.vision, ...patch } }))
  const [busy, setBusy] = useState(false)
  const pickVision = async (f?: File) => {
    setBusy(true)
    const id = await savePhoto(f)
    if (id) {
      upd({ photoId: id })
      toast(t('Foto de referência salva'))
    }
    setBusy(false)
  }
  const done = [!!v.photoId, !!v.result.trim(), !!v.feeling.trim(), !!v.why.trim()].filter(Boolean).length
  const nx = (id: string) => (nextId === id ? 'pj-next' : '')
  return (
    <div className="pj-sec">
      {done < 4 && (
        <div className="guide">
          <b>{t('Monte o seu objetivo em 4 passos')}</b>
          <div className="guide-bar">
            <span style={{ width: `${(done / 4) * 100}%` }} />
          </div>
          <small>{t('{a} de {b} prontos', { a: done, b: 4 })}</small>
        </div>
      )}
      <label className={`card pj-photo pj-step ${nx('pj-vision-photo')}`}>
        <span className="pj-step-n">
          <Num n={1} done={!!v.photoId} />
        </span>
        <input
          id="pj-vision-photo"
          type="file"
          accept="image/*"
          onChange={(e) => pickVision(e.target.files?.[0])}
        />
        {visionUrl ? (
          <img src={visionUrl} alt={t('Foto do shape que você quer ter')} />
        ) : (
          <span>
            <span className="pj-photo-ic">
              <Icon name="camera" size={26} />
            </span>
            <b className="ttl">
              {busy ? t('Salvando...') : t('Adicione uma foto do shape que você quer ter')}
              <Info text={t('Uma imagem do resultado que você quer. Ela vira o fundo do topo do Projetinho, para você ver todo dia.')} />
            </b>
            <small>{t('Pode ser uma foto de referência ou uma foto sua de quando estava em forma.')}</small>
          </span>
        )}
        {visionUrl && <span className="pj-photo-tag">{t('Toque para trocar')}</span>}
      </label>
      <PhotoButtons onFile={pickVision} disabled={busy} />

      <div className="card field">
        <label className={`pj-step ${nx('pj-result')}`}>
          <span className="ttl">
            <Num n={2} done={!!v.result.trim()} />
            {t('Qual resultado você quer alcançar?')}
            <Info text={t('Escreva em uma frase o resultado que você quer. Aparece em destaque no topo da tela.')} />
          </span>
          <textarea id="pj-result" rows={2} value={v.result} onChange={(e) => upd({ result: e.target.value })} placeholder={t('Ex.: chegar a 80 kg com o abdômen aparecendo')} />
          {!v.result.trim() && <Examples list={['Perder 8 kg', 'Ver o abdômen aparecer', 'Ganhar massa muscular', 'Voltar a caber nas minhas roupas']} onPick={(x) => upd({ result: x })} />}
        </label>
        <label className={`pj-step ${nx('pj-feeling')}`}>
          <span className="ttl">
            <Num n={3} done={!!v.feeling.trim()} />
            {t('Como você vai se sentir quando chegar lá?')}
            <Info text={t('Imaginar o sentimento ajuda a não desistir. Escreva como você vai se sentir no dia que chegar.')} />
          </span>
          <textarea id="pj-feeling" rows={2} value={v.feeling} onChange={(e) => upd({ feeling: e.target.value })} placeholder={t('Ex.: confiante para tirar a camisa na praia')} />
          {!v.feeling.trim() && <Examples list={['Orgulhoso de mim', 'Confiante para tirar a camisa', 'Com mais energia no dia a dia']} onPick={(x) => upd({ feeling: x })} />}
        </label>
        <label className={`pj-step ${nx('pj-why')}`}>
          <span className="ttl">
            <Num n={4} done={!!v.why.trim()} />
            {t('Por que isso é importante para você?')}
            <Info text={t('O motivo verdadeiro. É ele que segura você nos dias sem vontade.')} />
          </span>
          <textarea id="pj-why" rows={2} value={v.why} onChange={(e) => upd({ why: e.target.value })} placeholder={t('Ex.: quero ser exemplo para os meus filhos')} />
          {!v.why.trim() && <Examples list={['Quero cuidar da minha saúde', 'Quero me sentir bem no espelho', 'Quero provar que consigo']} onPick={(x) => upd({ why: x })} />}
        </label>
        <label>
          <span className="ttl">
            {t('Até que data você quer chegar lá?')}
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
  const key = today()
  const promisedToday = list.some((p) => p.date === key)
  const sorted = list.slice().sort((a, b) => Number(b.status === 'aberta' && b.date < key) - Number(a.status === 'aberta' && a.date < key))
  const set = (id: string, status: Promise_['status']) =>
    setProjeto((p) => ({ ...p, promises: p.promises.map((x) => (x.id === id ? { ...x, status } : x)) }))
  return (
    <div className="pj-sec">
      {!promisedToday && (
        <Guide
          title={t('Como funciona uma promessa')}
          steps={[t('Escreva uma coisa pequena que você vai fazer amanhã.'), t('Toque em Salvar promessa.'), t('Amanhã, volte aqui e toque em Cumpri ou Não cumpri.')]}
        />
      )}
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
          {t('Escreva uma promessa para você mesmo')}
          <Info text={t('Escreva um compromisso com você mesmo. Depois marque Cumpri ou Não cumpri. Promessas cumpridas aparecem no topo.')} />
        </span>
        <textarea id="pj-new-promise" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Ex.: vou treinar amanhã mesmo cansado')} />
        {!text.trim() && <Examples list={['Vou treinar amanhã mesmo cansado', 'Vou beber 2 litros de água amanhã', 'Não vou comer doce amanhã', 'Vou dormir antes da meia-noite']} onPick={setText} />}
        <WithInfo text={t('Salva a promessa na lista abaixo com a data de hoje.')}>
          <button type="submit" className="cta sm-cta">
            {t('Salvar promessa')}
          </button>
        </WithInfo>
      </form>
      {sorted.map((p) => (
        <div key={p.id} id={`pj-promise-${p.id}`} className={`card promise is-${p.status} ${p.status === 'aberta' && p.date < key ? 'is-late' : ''}`}>
          {p.status === 'aberta' && p.date < key && <span className="late-tag">{t('Responda: você cumpriu?')}</span>}
          <p>"{p.text}"</p>
          <small>{t('Prometido em {d}', { d: dm(p.date) })}</small>
          {p.status === 'aberta' ? (
            <div className="promise-actions">
              <button type="button" className="pa ok" title={t('Cumpri')} onClick={() => set(p.id, 'cumprida')}>
                <Icon name="check" size={16} stroke={3} /> {t('Cumpri')}
              </button>
              <button type="button" className="pa no" onClick={() => set(p.id, 'quebrada')}>
                <Icon name="x" size={16} stroke={3} /> {t('Não cumpri')}
              </button>
            </div>
          ) : (
            <span className={`promise-badge ${p.status === 'cumprida' ? 'ok' : 'bad'}`}>
              <Icon name={p.status === 'cumprida' ? 'check' : 'x'} size={14} stroke={3} />
              {p.status === 'cumprida' ? t('Cumprida') : t('Não cumprida. Faça uma nova promessa.')}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function Metas({ s }: { s: AppState }) {
  const list = getProjeto(s).goals
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const done = list.filter((g) => g.done).length
  const empty = list.length === 0
  const toggle = (g: Goal) => setProjeto((p) => ({ ...p, goals: p.goals.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)) }))
  return (
    <div className="pj-sec">
      {empty && (
        <Guide
          title={t('Como criar uma meta')}
          steps={[t('Escreva o que você quer conseguir.'), t('Escolha até que dia.'), t('Toque em Salvar meta. Quando conseguir, toque no círculo.')]}
        />
      )}
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
              <span className="goal-emo">
                <Icon name="target" size={20} />
              </span>
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
          setProjeto((p) => ({ ...p, goals: [...p.goals, { id: newId(), emoji: '', title: title.trim(), due, done: false }] }))
          setTitle('')
          setDue('')
        }}
      >
        <span className="pj-add-pre">
          {t('Escreva uma nova meta')}
          <Info text={t('Crie um objetivo com prazo, como correr 5 km. Escreva a meta, escolha a data limite e salve. Marque o círculo quando bater.')} />
        </span>
        <input id="pj-goal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Ex.: fazer 10 barras seguidas')} />
        {!title.trim() && <Examples list={['Perder 3 kg', 'Correr 5 km sem parar', 'Treinar 20 dias no mês', 'Fazer 10 flexões seguidas']} onPick={setTitle} />}
        <label>
          {t('Data limite')}
          <input id="pj-goal-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <WithInfo text={t('Salva a meta na lista. O app mostra quantos dias faltam até o prazo.')}>
          <button type="submit" className="cta sm-cta">
            {t('Salvar meta')}
          </button>
        </WithInfo>
      </form>
    </div>
  )
}

const MOODS = ['mal', 'irritado', 'triste', 'normal', 'bem', 'motivado']
const MOOD_LABEL: Record<string, string> = { mal: 'Mal', irritado: 'Irritado', triste: 'Triste', normal: 'Normal', bem: 'Bem', motivado: 'Motivado' }
// desabafos antigos guardavam emoji
const FROM_EMOJI: Record<string, string> = { '😫': 'mal', '😤': 'irritado', '😔': 'triste', '😐': 'normal', '🙂': 'bem', '💪': 'motivado' }
const moodId = (m: string) => FROM_EMOJI[m] ?? m
const REPLY: Record<string, string> = {
  mal: 'Dia pesado. Só não deixa ele virar dois. Amanhã a primeira refeição é a do plano.',
  irritado: 'Usa essa raiva no treino. Ela vira carga na barra.',
  triste: 'Tá tudo bem não estar bem. Você escreveu, e isso já é não fugir.',
  normal: 'Dia neutro também conta. Constância é feita de dias assim.',
  bem: 'Guarda esse sentimento. Ele é a prova de que está funcionando.',
  motivado: 'É isso. Lembra desse dia quando a vontade sumir.',
}

function Desabafo({ s }: { s: AppState }) {
  const list = getProjeto(s).vents
  const [mood, setMood] = useState('normal')
  const [text, setText] = useState('')
  const [reply, setReply] = useState<string | null>(null)
  const ventToday = list.some((x) => x.date === today())
  return (
    <div className="pj-sec">
      {!ventToday && !reply && (
        <Guide title={t('Conte como foi seu dia')} steps={[t('Toque em como você está.'), t('Escreva o que aconteceu hoje. Pode ser pouco.'), t('Toque em Salvar desabafo. Só você lê.')]} />
      )}
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
          {t('Como você está se sentindo hoje?')}
          <Info text={t('Um diário privado. Escolha como você está, escreva o que está sentindo e salve. O treinador responde na hora.')} />
        </span>
        <div className="chips">
          {MOODS.map((m) => (
            <button key={m} type="button" className={`chip ${mood === m ? 'on' : ''}`} onClick={() => setMood(m)}>
              {t(MOOD_LABEL[m])}
            </button>
          ))}
        </div>
        <textarea id="pj-vent" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Escreva o que está pesando. Só você vai ler.')} />
        <WithInfo text={t('Salva o desabafo com a data de hoje. Ninguém além de você vê.')}>
          <button type="submit" className="cta sm-cta">
            {t('Salvar desabafo')}
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
          <div>
            <small>
              {dm(v.date)} · {t(MOOD_LABEL[moodId(v.mood)] ?? 'Normal')}
            </small>
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
  const addPhoto = async (f?: File) => {
    setBusy(true)
    const id = await savePhoto(f)
    if (id) {
      setProjeto((p) => ({ ...p, photos: [{ id: newId(), photoId: id, caption: '', date: today() }, ...p.photos] }))
      toast(t('Foto salva na galeria'))
    }
    setBusy(false)
  }
  return (
    <div className="pj-sec">
      {list.length === 0 && <Guide title={t('Guarde os momentos do projeto')} steps={[t('Toque em Tirar foto ou Escolher da galeria.'), t('Pode ser do treino, do prato ou do espelho.'), t('Faça isso toda semana para ver sua evolução.')]} />}
      <label className="card pj-upload">
        <input
          id="pj-gallery"
          type="file"
          accept="image/*"
          onChange={(e) => {
            void addPhoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <Icon name="camera" size={22} /> {busy ? t('Salvando...') : t('Adicionar foto')}
        <Info text={t('Guarde qualquer momento do projeto: treino, prato, espelho. Toque numa foto para ver em tela cheia.')} />
      </label>
      <PhotoButtons onFile={addPhoto} disabled={busy} />
      {list.length === 0 ? (
        <p className="muted center-txt">{t('Nenhuma foto ainda. Adicione fotos dos seus treinos, refeições ou do espelho.')}</p>
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
