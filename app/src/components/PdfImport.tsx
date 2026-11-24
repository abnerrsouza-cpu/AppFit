// Enviar o PDF da dieta ou da ficha de treino: a IA lê, organiza e a pessoa confere antes de usar.
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { t, weekday } from '../i18n'
import { compress, putPhoto } from '../photos'
import { type PlanFile, type Profile, newId } from '../store'
import { PlanFiles } from './PlanFiles'
import { Icon } from './Icon'
import { LoginCta } from './LoginCta'

type Kind = 'diet' | 'workout' | 'routine'
type DietResult = { readable: boolean; meals: { name: string; time: string; items: string }[]; notes: string }
type RoutineResult = { readable: boolean; wake: string; sleep: string; tasks: { time: string; title: string }[]; notes: string }
type WorkoutResult = { readable: boolean; days: { weekday: number; title: string; items: string }[]; notes: string }

const MAX_MB = 10

const hhmm = (v: string) => (/^\d{1,2}:\d{2}$/.test(v) ? v.padStart(5, '0') : '12:00')

const readDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })

export function PdfImport({ kind, online, lang, upd, files }: { kind: Kind; online: boolean; lang: string; upd: (patch: Partial<Profile>) => void; files?: PlanFile[] }) {
  const keep = kind !== 'routine' // dieta e treino guardam o arquivo para consultar depois
  const filesKey = kind === 'diet' ? 'dietFiles' : 'trainFiles'
  const [saved, setSaved] = useState(false)
  const [ready, setReady] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [diet, setDiet] = useState<DietResult | null>(null)
  const [work, setWork] = useState<WorkoutResult | null>(null)
  const [rout, setRout] = useState<RoutineResult | null>(null)
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
    setSaved(false)
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImg = file.type.startsWith('image/')
    if (!isPdf && !isImg) return setErr(t('Escolha um PDF ou uma foto.'))
    if (file.size > MAX_MB * 1024 * 1024 && isPdf) return setErr(t('O PDF passa de {n} MB. Envie um arquivo menor.', { n: MAX_MB }))
    setBusy(true)
    let dataUrl = ''
    try {
      dataUrl = isImg ? await compress(file, 1600) : await readDataUrl(file)
    } catch {
      setBusy(false)
      return setErr(t('Não consegui abrir esse arquivo. Tente outro.'))
    }
    if (keep) {
      const id = `plan-${newId()}`
      await putPhoto(id, dataUrl)
      upd({ [filesKey]: [...(files || []), { id, name: file.name || t('Foto'), type: isImg ? 'image/jpeg' : 'application/pdf' }] } as Partial<Profile>)
      setSaved(true)
    }
    if (!online || ready !== true) {
      setBusy(false)
      if (input.current) input.current.value = ''
      return
    }
    try {
      const pdf = dataUrl.replace(/^data:[^,]*,/, '')
      const mime = isImg ? 'image/jpeg' : 'application/pdf'
      if (kind === 'routine') {
        const r = await api.planParse<RoutineResult>('routine', pdf, lang, mime)
        if (!r.readable || !r.tasks?.length) setErr(t('Não encontrei horários nesse PDF. Confira se é a sua rotina.'))
        else setRout(r)
      } else if (kind === 'diet') {
        const r = await api.planParse<DietResult>('diet', pdf, lang, mime)
        if (!r.readable || !r.meals?.length) setErr(t('Não encontrei refeições nesse PDF. Confira se é o plano alimentar.'))
        else setDiet(r)
      } else {
        const r = await api.planParse<WorkoutResult>('workout', pdf, lang, mime)
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
  const removeFile = (id: string) => upd({ [filesKey]: (files || []).filter((f) => f.id !== id) } as Partial<Profile>)

  const apply = () => {
    if (diet) {
      upd({ meals: diet.meals.map((m) => ({ id: newId(), name: m.name.trim(), time: hhmm(m.time), items: m.items.trim() })).sort((a, b) => a.time.localeCompare(b.time)) })
      setDiet(null)
    }
    if (rout) {
      upd({
        tasks: rout.tasks.map((x) => ({ id: newId(), time: hhmm(x.time), title: x.title.trim() })).sort((a, b) => a.time.localeCompare(b.time)),
        ...(/^\d{1,2}:\d{2}$/.test(rout.wake) ? { wake: hhmm(rout.wake) } : {}),
        ...(/^\d{1,2}:\d{2}$/.test(rout.sleep) ? { sleep: hhmm(rout.sleep) } : {}),
      })
      setRout(null)
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
    setRout(null)
  }

  const ai = online && ready === true
  const title = kind === 'diet' ? t('Envie sua dieta') : kind === 'routine' ? t('Tem sua rotina em PDF?') : t('Envie sua ficha de treino')
  const sub =
    kind === 'diet'
      ? ai
        ? t('PDF ou foto do plano do nutricionista. O app lê e preenche suas refeições e horários.')
        : t('PDF ou foto do plano do nutricionista. Fica salvo aqui para você abrir quando quiser.')
      : kind === 'routine'
        ? t('Envie um PDF com seus horários. O app lê e cria seus afazeres do dia.')
        : ai
          ? t('PDF ou foto da ficha do personal. O app lê e distribui os treinos pelos dias da semana.')
          : t('PDF ou foto da ficha do personal. Fica salva aqui para você abrir na academia.')

  // prévia: a pessoa confere antes de trocar o plano
  if (diet || work || rout) {
    const count = diet ? t('{n} refeições encontradas', { n: diet.meals.length }) : rout ? t('{n} afazeres encontrados', { n: rout.tasks.length }) : t('{n} dias de treino encontrados', { n: work!.days.length })
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
          {rout?.tasks.map((x, i) => (
            <li key={i}>
              <span className="pdf-tag">{hhmm(x.time)}</span>
              <div>
                <b>{x.title}</b>
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
        {(diet?.notes || work?.notes || rout?.notes) && <p className="pdf-notes">{diet?.notes || work?.notes || rout?.notes}</p>}
        <button type="button" className="cta" onClick={apply}>
          {t('Usar este plano')}
        </button>
        <button type="button" className="link" onClick={cancel}>
          {t('Cancelar')}
        </button>
      </div>
    )
  }

  // rotina: sem leitura automática, o cartão some (não há o que guardar)
  if (!keep && online && ready !== true) return null
  if (!keep && !online)
    return (
      <div className="card pdf-card off">
        <LoginCta compact text={t('Enviar PDF funciona na versão com conta.')} />
      </div>
    )
  return (
    <div className="card pdf-card">
      <div className="pdf-row">
        <span className="pdf-ic">
          <Icon name="upload" size={22} />
        </span>
        <div>
          <b>{title}</b>
          <small>{sub}</small>
        </div>
      </div>
      {keep && !!files?.length && <PlanFiles files={files} onRemove={removeFile} />}
      {busy ? (
        <div className="pdf-busy">
          <span className="spin" /> {ai ? t('Lendo seu arquivo. Isso pode levar até 1 minuto.') : t('Salvando...')}
        </div>
      ) : (
        <button type="button" className="ghost-btn" disabled={!keep && ready === null} onClick={() => input.current?.click()}>
          <Icon name="plus" size={18} /> {keep ? (files?.length ? t('Enviar outro arquivo') : t('Enviar PDF ou foto')) : t('Enviar PDF')}
        </button>
      )}
      <input ref={input} type="file" accept={keep ? 'application/pdf,.pdf,image/*' : 'application/pdf,.pdf'} hidden onChange={(e) => pick(e.target.files?.[0])} />
      {err && <small className="pdf-msg bad-msg">{err}</small>}
      {saved && !ai && <small className="pdf-msg ok-msg">{t('Arquivo salvo. Ele aparece na aba Treino e dieta.')}</small>}
      {done && <small className="pdf-msg ok-msg">{t('Pronto. Plano atualizado. Confira e ajuste abaixo se precisar.')}</small>}
    </div>
  )
}
