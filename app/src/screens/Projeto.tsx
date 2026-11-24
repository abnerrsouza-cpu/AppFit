import { useEffect, useState } from 'react'
import { editPhoto } from '../components/PhotoEditor'
import { AiTip } from '../components/AiTip'
import { Icon } from '../components/Icon'
import { PhotoButtons } from '../components/PhotoButtons'
import { Celebrate } from '../components/Celebrate'
import { toast } from '../components/Toast'
import { ProjetoFunnel } from './ProjetoFunnel'
import { Info, WithInfo } from '../components/Info'
import { t } from '../i18n'
import { type Factor, type PjStep, efficacyLabel, forecast, projetoStats, projetoTodo } from '../game'
import { compress, getPhoto, putPhoto } from '../photos'
import {
  type AppState,
  type Goal,
  type Promise_,
  type ProjetoArchive,
  addDays,
  daysBetween,
  fmtDayMonth,
  getProjeto,
  newId,
  parseYmd,
  blankProjeto,
  setProjeto,
  setState,
  today,
  ymd,
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

async function savePhoto(raw?: File, aspect = 3 / 4) {
  const file = raw && (await editPhoto(raw, aspect))
  if (!file) return undefined
  const url = await compress(file, 1100)
  const id = newId()
  await putPhoto(id, url)
  return id
}

export function Projeto({ s, initialSec, autoFunnel, onFunnelDone }: { s: AppState; initialSec?: Sec; autoFunnel?: boolean; onFunnelDone?: () => void }) {
  const pj = getProjeto(s)
  const todo = projetoTodo(s)
  const started = !!pj.startedAt
  // depois de começar: a tela mostra o andamento; as seções abrem por botão
  const [sec, setSecRaw] = useState<Sec | null>(() => initialSec ?? (started ? null : (SECS.find((x) => todo.count[x.id] > 0)?.id ?? 'expectativa')))
  const setSec = (x: Sec | null) => {
    setSecRaw(x)
    document.querySelector('.app')?.scrollTo(0, 0)
  }
  const next = todo.steps[0]
  const [funnel, setFunnel] = useState(() => !!autoFunnel && !started)
  const [party, setParty] = useState(false)
  const go = (st: PjStep) => {
    setSecRaw(st.sec)
    focusField(st.target)
  }
  const visionUrl = usePhoto(pj.vision.photoId)
  const left = Math.max(0, daysBetween(new Date(), parseYmd(pj.vision.targetDate)))
  const kept = pj.promises.filter((p) => p.status === 'cumprida').length
  const goalsDone = pj.goals.filter((g) => g.done).length

  if (started && sec)
    return (
      <div className="screen">
        <div className="sheet-h">
          <button type="button" className="round-btn" onClick={() => setSec(null)} aria-label={t('Voltar')}>
            <Icon name="back" />
          </button>
          <span className="eyebrow">{t({ expectativa: 'Meu objetivo', promessas: 'Promessas', metas: 'Metas', desabafo: 'Desabafo', fotos: 'Fotos' }[sec])}</span>
        </div>
        {sec === 'expectativa' && <Expectativa s={s} visionUrl={visionUrl} nextId={next?.sec === 'expectativa' ? next.target : undefined} />}
        {sec === 'promessas' && <Promessas s={s} />}
        {sec === 'metas' && <Metas s={s} />}
        {sec === 'desabafo' && <Desabafo s={s} />}
        {sec === 'fotos' && <Fotos s={s} />}
      </div>
    )

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
            setSecRaw(null)
            setParty(true)
            document.querySelector('.app')?.scrollTo(0, 0)
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
          top
          onClose={() => {
            setParty(false)
            onFunnelDone?.()
          }}
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

      {started && <Andamento s={s} onSec={setSec} />}

      {started && (
        <>
          <p className="ttl hint">{t('Seu projetinho')}</p>
          <div className="pj-tiles">
            {(['promessas', 'metas', 'desabafo', 'fotos', 'expectativa'] as Sec[]).map((x) => (
              <button key={x} type="button" className="card pj-tile" onClick={() => setSec(x)}>
                <span className="pj-tile-ic">
                  <Icon name={{ promessas: 'star', metas: 'target', desabafo: 'quote', fotos: 'camera', expectativa: 'flame' }[x]} size={20} />
                </span>
                <b>{t({ expectativa: 'Meu objetivo', promessas: 'Promessas', metas: 'Metas', desabafo: 'Desabafo', fotos: 'Fotos' }[x])}</b>
                {todo.count[x] > 0 && <i className="cat-badge">{todo.count[x]}</i>}
              </button>
            ))}
          </div>
          <NewProject s={s} onStart={() => setFunnel(true)} />
        </>
      )}

      {!started && (
      <>
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
      </>
      )}
    </div>
  )
}

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)

const F_LABEL: Record<Factor, string> = { treino: 'Treino', dieta: 'Dieta', cardio: 'Cardio' }
const F_TIP: Record<Factor, string> = {
  treino: 'Cumpra os dias de treino da semana. Treino perdido é o que mais empurra a data.',
  dieta: 'A dieta pesa mais que tudo no resultado. Siga o plano e dê nota sincera à noite.',
  cardio: 'Faça o cardio do dia e marque no app. São só alguns minutos que adiantam semanas.',
}
const wk = (n: number) => (n === 1 ? t('1 semana') : t('{n} semanas', { n: String(n).replace('.', ',') }))
const dmy = (d: Date) => d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }).replace('.', '')

/** Previsão: quando você chega na meta fazendo o que está fazendo. */
function Previsao({ s }: { s: AppState }) {
  const f = forecast(s)
  if (!f) return null
  const goal = s.profile.weightGoal
  const nowW = (f.target.getTime() - Date.now()) / (7 * 86400000)
  const span = Math.max(nowW, f.weeks ?? 0, f.bestWeeks, 1) * 1.12
  const pos = (w: number) => `${Math.min(100, (w / span) * 100)}%`
  const tone = f.weeks === null ? 'bad' : (f.diffWeeks ?? 0) >= 1 ? 'good' : (f.diffWeeks ?? 0) > -1 ? 'ok' : 'bad'
  const rows: [Factor, number][] = [
    ['treino', f.train],
    ['dieta', f.diet],
    ['cardio', f.cardio],
  ]
  return (
    <section className={`card pv pv-${tone}`}>
      <div className="pv-h">
        <span className="eyebrow">{t('Previsão')}</span>
        <Info text={t('Calculada com o que você fez nos últimos 14 dias: treinos feitos, nota da dieta e cardio. Com pesagens semanais, a balança também entra na conta. Quanto mais você registra, mais certa fica.')} />
      </div>
      {f.weeks === null ? (
        <>
          <b className="pv-big">{t('Nesse ritmo, você não chega em {g} kg.', { g: goal })}</b>
          <p className="pv-sub">{t('O que você está fazendo hoje ainda não mexe no ponteiro. Dá para virar isso já nesta semana.')}</p>
        </>
      ) : (
        <>
          <b className="pv-big">{t('Nesse ritmo, você chega em {g} kg em {d}.', { g: goal, d: dmy(f.eta!) })}</b>
          <p className="pv-sub">
            {t('Faltam {kg} kg. Daqui a cerca de {w}.', { kg: String(f.kgLeft).replace('.', ','), w: wk(f.weeks) })}
          </p>
        </>
      )}
      <span className={`pv-pill pv-${tone}`}>
        {f.weeks === null
          ? t('Fora do prazo')
          : (f.diffWeeks ?? 0) >= 1
            ? t('{w} antes do prazo', { w: wk(Math.floor(f.diffWeeks!)) })
            : (f.diffWeeks ?? 0) > -1
              ? t('Dentro do prazo')
              : t('{w} depois do prazo', { w: wk(Math.ceil(-f.diffWeeks!)) })}
      </span>

      <div className="pv-line" aria-hidden="true">
        <span className="pv-track" />
        <i className="pv-dot pv-today" style={{ left: 0 }}>
          <small>{t('Hoje')}</small>
        </i>
        <i className="pv-dot pv-best" style={{ left: pos(f.bestWeeks) }}>
          <small>{t('Cumprindo tudo')}</small>
        </i>
        <i className="pv-dot pv-target" style={{ left: pos(nowW) }}>
          <small>{t('Prazo')}</small>
        </i>
        {f.weeks !== null && (
          <i className={`pv-dot pv-you pv-${tone}`} style={{ left: pos(f.weeks) }}>
            <small>{t('Você')}</small>
          </i>
        )}
      </div>

      <div className="pv-rows">
        {rows.map(([k, v]) => (
          <div key={k} className={`pv-row ${k === f.weakest ? 'weak' : ''}`}>
            <span>{t(F_LABEL[k])}</span>
            <span className="pv-bar">
              <span style={{ width: `${Math.round(v * 100)}%` }} />
            </span>
            <b>{Math.round(v * 100)}%</b>
          </div>
        ))}
        <small className="muted">{t('Quanto você cumpriu nos últimos 14 dias')}</small>
      </div>

      <div className="pv-tip">
        <b>{t('O que mais te atrasa: {f}', { f: t(F_LABEL[f.weakest]).toLowerCase() })}</b>
        <p>{t(F_TIP[f.weakest])}</p>
        {f.gainIfFix === -1 ? (
          <p className="pv-gain">{t('Só corrigindo isso, você passa a chegar na meta.')}</p>
        ) : f.gainIfFix && f.gainIfFix >= 0.5 ? (
          <p className="pv-gain">{t('Corrigindo isso, você chega {w} antes.', { w: wk(Math.round(f.gainIfFix)) })}</p>
        ) : null}
      </div>

      <p className="pv-best">
        <Icon name="flame" size={16} /> {t('Cumprindo tudo, você chega em {d}.', { d: dmy(f.bestEta) })}
      </p>
      {f.days < 5 && <small className="muted">{t('Ainda com poucos dias de dados. A previsão fica mais certa a cada dia registrado.')}</small>}
    </section>
  )
}

/** Painel do andamento: tempo, eficácia, ritmo e o porquê. */
function Andamento({ s, onSec }: { s: AppState; onSec: (x: Sec) => void }) {
  const st = projetoStats(s)
  const v = getProjeto(s).vision
  const p = s.profile
  const eff = st.efficacy
  const R = 46
  const C = 2 * Math.PI * R
  const tone = eff === null ? '' : eff >= 0.8 ? 'good' : eff >= 0.6 ? 'ok' : eff >= 0.4 ? 'warn' : 'bad'
  const rows: { l: string; v: number | null; d: string; i: string }[] = [
    { l: t('Constância'), v: st.constancy, d: t('{a} de {b} noites com prestação de contas', { a: st.logs, b: st.closed }), i: 'list' },
    { l: t('Treinos'), v: st.trainScore, d: st.trainsPlanned ? t('{a} de {b} treinos feitos', { a: st.trainsDone, b: st.trainsPlanned }) : t('dos treinos planejados cumpridos'), i: 'dumbbell' },
    { l: t('Dieta'), v: st.diet, d: t('nota média que você deu para a dieta'), i: 'food' },
    { l: t('Promessas'), v: st.promises, d: t('{a} cumpridas, {b} quebradas', { a: st.kept, b: st.broken }), i: 'star' },
  ]
  let pace = ''
  if (st.weightPct !== null && st.closed >= 7) {
    const diff = st.weightPct - st.timePct
    pace = diff >= 0.05 ? t('Você está à frente do ritmo. Continue.') : diff <= -0.1 ? t('Você está atrás do ritmo. Precisa apertar para chegar a tempo.') : t('Você está no ritmo certo para chegar lá.')
  }
  const lesson = getProjeto(s).lesson
  return (
    <>
      {lesson && (
        <section className="card pj-lesson">
          <small>{t('Tentativa {n}', { n: lesson.attempt })}</small>
          <b>{t('Da última vez você falhou por: {w}', { w: lesson.why.join(', ').toLowerCase() })}</b>
          <p>
            {t('Você prometeu:')} <em>“{lesson.text}”</em>
          </p>
        </section>
      )}
      <section className="card pj-time">
        <div className="pj-time-h">
          <span>
            <small>{t('Dia {a} de {b}', { a: st.elapsed, b: st.total })}</small>
            <b>{st.left === 1 ? t('Falta 1 dia') : t('Faltam {n} dias', { n: st.left })}</b>
          </span>
          <span className="pj-time-pct">{Math.round(st.timePct * 100)}%</span>
        </div>
        <div className="pl-bar">
          <span style={{ width: `${st.timePct * 100}%` }} />
        </div>
        <small className="muted">{t('do tempo do seu projetinho já passou')}</small>
      </section>

      <Previsao s={s} />

      <section className="card pj-eff">
        <div className="pj-eff-top">
          <svg viewBox="0 0 110 110" className={`pj-ring ${tone}`} aria-hidden="true">
            <circle cx="55" cy="55" r={R} className="bg" />
            <circle cx="55" cy="55" r={R} className="fg" strokeDasharray={C} strokeDashoffset={C * (1 - (eff ?? 0))} />
          </svg>
          <span className="pj-eff-n">
            <b>{pct(eff)}</b>
            <small>{t('eficácia')}</small>
          </span>
          <span className="pj-eff-txt">
            <b className="ttl">
              {eff === null ? t('Ainda sem dados') : efficacyLabel(eff)}
              <Info text={t('A média de constância, treinos, dieta e promessas desde o início do projetinho. Atualiza a cada prestação de contas.')} />
            </b>
            <small>{eff === null ? t('Preste contas hoje à noite para começar a medir.') : t('Desde {d}', { d: fmtDayMonth(parseYmd(st.start)) })}</small>
          </span>
        </div>
        <ul className="pj-eff-list">
          {rows.map((r) => (
            <li key={r.l}>
              <span className="pj-eff-ic">
                <Icon name={r.i} size={16} />
              </span>
              <span className="pj-eff-l">
                <b>{r.l}</b>
                <small>{r.d}</small>
              </span>
              <span className="pj-eff-v">{pct(r.v)}</span>
              <span className="pj-eff-bar">
                <span style={{ width: `${(r.v ?? 0) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {st.weightPct !== null && (
        <section className="card pj-pace">
          <b className="ttl">{t('Ritmo até a meta')}</b>
          <div className="pj-pace-row">
            <span>
              <small>{t('Início')}</small>
              <b>{p.weightStart} kg</b>
            </span>
            <span>
              <small>{t('Agora')}</small>
              <b>{st.cur} kg</b>
            </span>
            <span>
              <small>{t('Meta')}</small>
              <b>{p.weightGoal} kg</b>
            </span>
          </div>
          <div className="pj-pace-bars">
            <small>{t('Caminho feito')}</small>
            <div className="pl-bar">
              <span style={{ width: `${st.weightPct * 100}%` }} />
            </div>
            <small>{t('Tempo passado')}</small>
            <div className="pl-bar time">
              <span style={{ width: `${st.timePct * 100}%` }} />
            </div>
          </div>
          {pace && <p className="pj-pace-msg">{pace}</p>}
          {!pace && <small className="muted">{t('Atualize o peso no check-in semanal para ver se você está no ritmo.')}</small>}
        </section>
      )}

      {(v.why || v.feeling) && (
        <button type="button" className="card pj-why" onClick={() => onSec('expectativa')}>
          <small>{t('Lembre por que você começou')}</small>
          {v.why && <b>"{v.why}"</b>}
          {v.feeling && <span>{t('Quando chegar lá: {f}', { f: v.feeling })}</span>}
        </button>
      )}
    </>
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
            <small>{t('O melhor: você mesmo, criado com IA no shape que quer ter. Veja como logo abaixo.')}</small>
          </span>
        )}
        {visionUrl && <span className="pj-photo-tag">{t('Toque para trocar')}</span>}
      </label>
      <PhotoButtons onFile={pickVision} disabled={busy} />
      {!visionUrl && <AiTip profile={s.profile} compact />}

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
    const id = await savePhoto(f, 4 / 5)
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

const WHY = ['Preguiça', 'Falta de tempo', 'Trabalho', 'Perdi a motivação', 'Comi errado', 'Fiquei doente ou com lesão', 'Bebida e festas', 'Outro']
const ADD_DAYS = [7, 15, 30]

/** Quando não está dando certo: reajustar o plano ou recomeçar assumindo a falha. Quando acaba o prazo: começar outro. */
function NewProject({ s, onStart }: { s: AppState; onStart: () => void }) {
  const [mode, setMode] = useState<'' | 'adjust' | 'fail' | 'new'>('')
  const hist = s.projetoHistory ?? []
  const pj = getProjeto(s)
  const st = projetoStats(s)
  const fails = hist.filter((h) => h.failed).length
  const ended = st.left <= 0
  // reajuste
  const [plus, setPlus] = useState(0)
  const [goalW, setGoalW] = useState(String(s.profile.weightGoal))
  const [reason, setReason] = useState('')
  // falha
  const [why, setWhy] = useState<string[]>([])
  const [lesson, setLesson] = useState('')
  const [confirmTxt, setConfirmTxt] = useState('')
  const word = t('EU FALHEI')
  const canFail = why.length > 0 && lesson.trim().length >= 5 && confirmTxt.trim().toUpperCase() === word.toUpperCase()
  const adjusts = pj.adjusts ?? []

  const archive = (extra: Partial<ProjetoArchive>) => ({
    result: pj.vision.result,
    startedAt: pj.startedAt ?? new Date().toISOString(),
    endedAt: new Date().toISOString(),
    efficacy: st.efficacy,
    kept: st.kept,
    goalsDone: pj.goals.filter((g) => g.done).length,
    goals: pj.goals.length,
    ...extra,
  })
  const restart = (failed: boolean) => {
    setState((x) => ({
      ...x,
      projetoHistory: [archive(failed ? { failed: true, why: why.map((w) => t(w)), lesson: lesson.trim() } : {}), ...(x.projetoHistory ?? [])],
      // zera objetivo, promessas e metas; desabafos e fotos continuam
      projeto: {
        ...blankProjeto(today(), x.profile.cycleDays),
        vents: pj.vents,
        photos: pj.photos,
        ...(failed ? { lesson: { why: why.map((w) => t(w)), text: lesson.trim(), attempt: fails + 2 } } : {}),
      },
    }))
    setMode('')
    onStart()
  }
  const saveAdjust = () => {
    const w = Number(goalW.replace(',', '.'))
    setState((x) => {
      const cur = getProjeto(x)
      return {
        ...x,
        profile: w > 30 && w < 300 ? { ...x.profile, weightGoal: w } : x.profile,
        projeto: {
          ...cur,
          vision: { ...cur.vision, targetDate: plus ? ymd(addDays(parseYmd(cur.vision.targetDate), plus)) : cur.vision.targetDate },
          adjusts: [...(cur.adjusts ?? []), { date: today(), days: plus, reason: reason.trim() }],
        },
      }
    })
    toast(t('Projetinho reajustado'), t('Plano novo, mesma regra: sem desculpa.'))
    setMode('')
    setPlus(0)
    setReason('')
  }

  return (
    <>
      {mode === '' && (
        <section className={`card pj-fork ${ended ? 'ended' : ''}`}>
          <b className="pj-fork-t">{ended ? t('O prazo do seu projetinho acabou') : t('Não está saindo como planejado?')}</b>
          <p>{ended ? t('Feche este ciclo e comece o próximo. Seja honesto sobre como foi.') : t('Seja honesto com você. Ajuste o plano ou recomece do zero assumindo que falhou.')}</p>
          {ended && (
            <button type="button" className="cta" onClick={() => setMode('new')}>
              <Icon name="plus" size={18} /> {t('Novo projetinho')}
            </button>
          )}
          <button type="button" className="ghost-btn" onClick={() => setMode('adjust')}>
            <Icon name="target" size={18} /> {t('Reajustar o projetinho')}
          </button>
          <button type="button" className="pj-fail-btn" onClick={() => setMode('fail')}>
            {fails > 0 ? t('RECOMEÇAR E ASSUMIR QUE EU FALHEI DE NOVO') : t('RECOMEÇAR E ASSUMIR QUE EU FALHEI')}
          </button>
        </section>
      )}

      {mode === 'new' && (
        <section className="card pj-new-ask">
          <b>{t('Começar um novo projetinho?')}</b>
          <p>{t('O atual vai para o histórico com o resultado e a eficácia. Objetivo, promessas e metas começam do zero. Seus desabafos e fotos continuam guardados.')}</p>
          <button type="button" className="cta" onClick={() => restart(false)}>
            {t('Sim, começar outro')}
          </button>
          <button type="button" className="link" onClick={() => setMode('')}>
            {t('Cancelar')}
          </button>
        </section>
      )}

      {mode === 'adjust' && (
        <section className="card pj-adj">
          <b className="pj-fork-t">{t('Reajustar o projetinho')}</b>
          <p>{t('Você continua de onde está. Nada é apagado. Só o plano fica mais realista.')}</p>
          {adjusts.length >= 2 && <p className="pj-warn">{t('Você já reajustou {n} vezes. Cuidado: reajustar demais também é desculpa.', { n: adjusts.length })}</p>}
          <span className="pj-adj-l">{t('Mais tempo para chegar lá')}</span>
          <div className="chips">
            <button type="button" className={`chip ${plus === 0 ? 'on' : ''}`} onClick={() => setPlus(0)}>
              {t('Manter prazo')}
            </button>
            {ADD_DAYS.map((d) => (
              <button key={d} type="button" className={`chip ${plus === d ? 'on' : ''}`} onClick={() => setPlus(d)}>
                +{d} {t('dias')}
              </button>
            ))}
          </div>
          <small className="muted">{t('Novo prazo: {d}', { d: fmtDayMonth(addDays(parseYmd(pj.vision.targetDate), plus)) })}</small>
          <label className="pj-adj-l" htmlFor="pj-adj-w">
            {t('Meta de peso (kg)')}
          </label>
          <input id="pj-adj-w" inputMode="decimal" value={goalW} onChange={(e) => setGoalW(e.target.value)} />
          <label className="pj-adj-l" htmlFor="pj-adj-r">
            {t('O que precisa mudar?')}
          </label>
          <textarea id="pj-adj-r" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Ex.: vou treinar de manhã, antes do trabalho.')} />
          <button type="button" className="cta" onClick={saveAdjust}>
            {t('Salvar reajuste')}
          </button>
          <button type="button" className="link" onClick={() => setMode('')}>
            {t('Cancelar')}
          </button>
        </section>
      )}

      {mode === 'fail' && (
        <section className="card pj-failbox">
          <b className="pj-fork-t">{fails > 0 ? t('Você falhou de novo. Assuma.') : t('Assuma que falhou')}</b>
          <p>{t('Falhar não te define. Fingir que não falhou, sim. Responda com sinceridade.')}</p>
          <span className="pj-adj-l">{t('Por que você falhou?')}</span>
          <div className="chips">
            {WHY.map((w) => (
              <button key={w} type="button" className={`chip ${why.includes(w) ? 'on' : ''}`} onClick={() => setWhy((x) => (x.includes(w) ? x.filter((y) => y !== w) : [...x, w]))}>
                {t(w)}
              </button>
            ))}
          </div>
          <label className="pj-adj-l" htmlFor="pj-fail-l">
            {t('O que vai ser diferente desta vez?')}
          </label>
          <textarea id="pj-fail-l" rows={3} value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder={t('Ex.: deixar a roupa de treino separada na noite anterior.')} />
          <label className="pj-adj-l" htmlFor="pj-fail-c">
            {t('Digite {w} para confirmar', { w: word })}
          </label>
          <input id="pj-fail-c" value={confirmTxt} onChange={(e) => setConfirmTxt(e.target.value)} placeholder={word} autoCapitalize="characters" />
          <small className="muted">{t('Objetivo, promessas e metas começam do zero. Desabafos e fotos ficam. O motivo da falha fica no histórico e aparece no painel do próximo projetinho.')}</small>
          <button type="button" className="pj-fail-btn" disabled={!canFail} onClick={() => restart(true)}>
            {t('RECOMEÇAR DO ZERO')}
          </button>
          <button type="button" className="link" onClick={() => setMode('')}>
            {t('Cancelar')}
          </button>
        </section>
      )}
      {hist.length > 0 && (
        <section className="card pj-hist">
          <b className="ttl">{t('Projetinhos anteriores')}</b>
          <ul>
            {hist.map((h, i) => (
              <li key={i}>
                <span>
                  <b>
                    {h.failed && <i className="pj-hist-fail">{t('Falhei')}</i>}
                    {h.result || t('Sem título')}
                  </b>
                  {h.failed && !!h.why?.length && <small className="pj-hist-why">{h.why.join(' · ')}</small>}
                  <small>
                    {fmtDayMonth(new Date(h.startedAt))} → {fmtDayMonth(new Date(h.endedAt))} · {t('{a} promessas cumpridas', { a: h.kept })} · {t('{a} de {b} metas', { a: h.goalsDone, b: h.goals })}
                  </small>
                </span>
                <span className="pj-hist-eff">{h.efficacy === null ? '—' : `${Math.round(h.efficacy * 100)}%`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
