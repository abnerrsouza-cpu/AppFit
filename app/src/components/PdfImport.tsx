// Enviar o PDF da dieta ou da ficha de treino: a IA lê, organiza e a pessoa confere antes de usar.
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { t, weekday } from '../i18n'
import { type Profile, newId } from '../store'
import { Icon } from './Icon'
import { LoginCta } from './LoginCta'

type Kind = 'diet' | 'workout'
type DietResult = { readable: boolean; meals: { name: string; time: string; items: string }[]; notes: string }
type WorkoutResult = { readable: boolean; days: { weekday: number; title: string; items: string }[]; notes: string }

const MAX_MB = 10

function readBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

const hhmm = (v: string) => (/^\d{1,2}:\d{2}$/.test(v) ? v.padStart(5, '0') : '12:00')

export function PdfImport({ kind, online, lang, upd }: { kind: Kind; online: boolean; lang: string; upd: (patch: Partial<Profile>) => void }) {
  const [ready, setReady] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [diet, setDiet] = useState<DietResult | null>(null)
  const [work, setWork] = useState<WorkoutResult | null>(null)
  const [done, setDone] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!online) return
    api.planReady().then((r) => setReady(r.ready), () => setReady(false))
  }, [online])

  const pick = async (file?: File) => {
    if (!file) return
    setErr('')
    setDone(false)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return setErr(t('Escolha um arquivo PDF.'))
    if (file.size > MAX_MB * 1024 * 1024) return setErr(t('O PDF passa de {n} MB. Envie um arquivo menor.', { n: MAX_MB }))
    setBusy(true)
    try {
      const pdf = await readBase64(file)
      if (kind === 'diet') {
        const r = await api.planParse<DietResult>('diet', pdf, lang)
        if (!r.readable || !r.meals?.length) setErr(t('Não encontrei refeições nesse PDF. Confira se é o plano alimentar.'))
        else setDiet(r)
      } else {
        const r = await api.planParse<WorkoutResult>('workout', pdf, lang)
        if (!r.readable || !r.days?.length) setErr(t('Não encontrei treinos nesse PDF. Confira se é a ficha de treino.'))
        else setWork(r)
      }
    } catch (e) {
      setErr(t((e as Error).message) || t('Não consegui ler o PDF agora. Tente de novo.'))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const apply = () => {
    if (diet) {
      upd({ meals: diet.meals.map((m) => ({ id: newId(), name: m.name.trim(), time: hhmm(m.time), items: m.items.trim() })).sort((a, b) => a.time.localeCompare(b.time)) })
      setDiet(null)
    }
    if (work) {
      const seen = new Set<number>()
      const days = work.days.filter((d) => d.weekday >= 0 && d.weekday <= 6 && !seen.has(d.weekday) && seen.add(d.weekday))
      upd({ workouts: days.map((d) => ({ weekday: d.weekday, title: d.title.trim(), items: d.items.trim() })).sort((a, b) => a.weekday - b.weekday) })
      setWork(null)
    }
    setDone(true)
  }
  const cancel = () => {
    setDiet(null)
    setWork(null)
  }

  const title = kind === 'diet' ? t('Tem o plano em PDF?') : t('Tem a ficha em PDF?')
  const sub = kind === 'diet' ? t('Envie o PDF do nutricionista. O app lê e preenche suas refeições e horários.') : t('Envie o PDF do personal. O app lê e distribui os treinos pelos dias da semana.')

  // prévia: a pessoa confere antes de trocar o plano
  if (diet || work) {
    const count = diet ? t('{n} refeições encontradas', { n: diet.meals.length }) : t('{n} dias de treino encontrados', { n: work!.days.length })
    return (
      <div className="card pdf-card preview">
        <b className="pdf-h">
          <Icon name="check" size={18} /> {count}
        </b>
        <p className="lead">{t('Confira. Ao usar, este plano substitui o que está abaixo.')}</p>
        <ul className="pdf-list">
          {diet?.meals.map((m, i) => (
            <li key={i}>
              <span className="pdf-tag">{hhmm(m.time)}</span>
              <div>
                <b>{m.name}</b>
                <small>{m.items.split('\n').filter(Boolean).join(' · ')}</small>
              </div>
            </li>
          ))}
          {work?.days
            .slice()
            .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))
            .map((d, i) => (
              <li key={i}>
                <span className="pdf-tag cap">{weekday(d.weekday).slice(0, 3)}</span>
                <div>
                  <b>{d.title}</b>
                  <small>{t('{n} exercícios', { n: d.items.split('\n').filter((x) => x.trim()).length })}</small>
                </div>
              </li>
            ))}
        </ul>
        {(diet?.notes || work?.notes) && <p className="pdf-notes">{diet?.notes || work?.notes}</p>}
        <button type="button" className="cta" onClick={apply}>
          {t('Usar este plano')}
        </button>
        <button type="button" className="link" onClick={cancel}>
          {t('Cancelar')}
        </button>
      </div>
    )
  }

  const blocked = !online ? 'login' : ready === false ? t('A leitura de PDF ainda não foi ativada. Por enquanto, preencha abaixo.') : ''
  return (
    <div className={`card pdf-card ${blocked ? 'off' : ''}`}>
      <div className="pdf-row">
        <span className="pdf-ic">
          <Icon name="list" size={22} />
        </span>
        <div>
          <b>{title}</b>
          <small>{sub}</small>
        </div>
      </div>
      {busy ? (
        <div className="pdf-busy">
          <span className="spin" /> {t('Lendo seu PDF. Isso pode levar até 1 minuto.')}
        </div>
      ) : (
        <button type="button" className="ghost-btn" disabled={!!blocked || ready === null} onClick={() => input.current?.click()}>
          <Icon name="plus" size={18} /> {t('Enviar PDF')}
        </button>
      )}
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {blocked === 'login' ? <LoginCta compact text={t('Enviar PDF funciona na versão com conta.')} /> : blocked && <small className="pdf-msg">{blocked}</small>}
      {err && <small className="pdf-msg bad-msg">{err}</small>}
      {done && <small className="pdf-msg ok-msg">{t('Pronto. Plano atualizado. Confira e ajuste abaixo se precisar.')}</small>}
    </div>
  )
}
