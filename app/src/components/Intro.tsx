import { Fragment, useEffect, useState } from 'react'
import { avatarUrl } from '../api'
import { t } from '../i18n'
import { getPhoto } from '../photos'
import { type AppState, cycleInfo, daysBetween, getProjeto, parseYmd } from '../store'
import { Icon } from './Icon'
import { quoteOfDay } from '../quotes'

const PHOTOS = 10_000 // 10 s obrigatórios com as fotos
const HALF = PHOTOS / 2
const QUOTE = 5_000 // depois, 5 s com a frase do dia
const TOTAL = PHOTOS + QUOTE

/** Abertura animada de 10 s obrigatórios (não dá para pular): "Esse é você" e depois "Essa é sua referência". */
export function Intro({ s, userId, hasAvatar, onDone }: { s: AppState; userId?: number; hasAvatar?: boolean; onDone: () => void }) {
  const [me, setMe] = useState<string | null>(null)
  const [ref, setRef] = useState<string | null>(null)
  const [phase, setPhase] = useState<0 | 1 | 2>(0)
  const [quote] = useState(() => quoteOfDay())
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    let alive = true
    // foto mais recente: última foto semanal; se não houver, foto de perfil
    const weeks = Object.values(s.weekly)
      .filter((w) => w.photoId)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    if (weeks[0]?.photoId) getPhoto(weeks[0].photoId).then((u) => alive && setMe(u ?? null))
    else if (userId && hasAvatar) setMe(avatarUrl(userId))
    const vid = getProjeto(s).vision.photoId
    if (vid) getPhoto(vid).then((u) => alive && setRef(u ?? null))
    return () => {
      alive = false
    }
  }, [s, userId, hasAvatar])

  useEffect(() => {
    const a = setTimeout(() => setPhase(1), HALF)
    const q = setTimeout(() => setPhase(2), PHOTOS)
    const b = setTimeout(() => finish(), TOTAL)
    return () => {
      clearTimeout(a)
      clearTimeout(q)
      clearTimeout(b)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = () => {
    setLeaving(true)
    setTimeout(onDone, 350)
  }

  const c = cycleInfo(s.profile)
  const v = getProjeto(s).vision
  const left = Math.max(0, daysBetween(new Date(), parseYmd(v.targetDate)))
  const initial = (s.profile.name || '?').slice(0, 1).toUpperCase()

  return (
    <div className={`intro ${leaving ? 'out' : ''}`} role="dialog" aria-modal="true" aria-label={t('Abertura')}>
      <div className={`intro-slide ${phase === 0 ? 'on' : ''}`}>
        <span className="intro-kicker">{t('Dia {a} de {b}', { a: c.day, b: s.profile.cycleDays })}</span>
        <h1 className="intro-title">{t('Esse é você')}</h1>
        <div className="intro-photo">
          {me ? <img src={me} alt="" /> : <span className="intro-empty">{initial}</span>}
        </div>
        {!me && <p className="intro-hint">{t('Envie sua foto no check-in semanal para se ver aqui.')}</p>}
      </div>

      <div className={`intro-slide ${phase === 1 ? 'on' : ''}`}>
        <span className="intro-kicker">{t('Faltam {n} dias', { n: left })}</span>
        <h1 className="intro-title">{t('Essa é sua referência')}</h1>
        <div className="intro-photo ref">
          {ref ? (
            <img src={ref} alt="" />
          ) : (
            <span className="intro-empty">
              <Icon name="target" size={44} />
            </span>
          )}
        </div>
        {v.result ? <p className="intro-goal">{v.result}</p> : !ref && <p className="intro-hint">{t('Escolha sua foto de referência no Projetinho.')}</p>}
      </div>

      <div className={`intro-quote ${phase === 2 ? 'on' : ''}`}>
        <p>
          {quote.split(' ').map((w, i) => (
            <Fragment key={i}>
              <span style={{ animationDelay: `${i * 70}ms` }}>{w}</span>{' '}
            </Fragment>
          ))}
        </p>
      </div>

      <div className={`intro-foot ${phase === 2 ? 'quote' : ''}`}>
        <small>{t('Lembre por que você começou.')}</small>
        <div className="intro-bar">
          <span />
        </div>
      </div>
    </div>
  )
}
