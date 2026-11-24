// Tela de vitória: aparece na hora em que a pessoa marca o treino do dia como feito.
import { useMemo } from 'react'
import { t, weekdayShort } from '../i18n'
import { type AppState, streak, today, trainedOn, weekDays, ymd } from '../store'
import { Icon } from './Icon'

const LINES = [
  'Treinou. O dia já é seu.',
  'Você fez o que a maioria só promete.',
  'Mais um tijolo no shape que você quer.',
  'Hoje não teve desculpa.',
  'É assim que se constrói o corpo: um dia de cada vez.',
  'Seu eu do futuro agradece.',
]

export function Victory({ s, onClose }: { s: AppState; onClose: () => void }) {
  const line = useMemo(() => LINES[Math.floor(Math.random() * LINES.length)], [])
  const days = weekDays()
  const key = today()
  const count = days.reduce((a, d) => a + (trainedOn(s, ymd(d)) >= 1 ? 1 : 0), 0)
  const st = streak(s)
  const letter = s.profile.letter.trim().split(/\n+/)[0]?.slice(0, 140)
  const pieces = Array.from({ length: 48 }, (_, i) => i)
  return (
    <div className="victory" role="dialog" aria-modal="true" aria-label={t('Treino feito')}>
      <div className="confetti" aria-hidden="true">
        {pieces.map((i) => (
          <i
            key={i}
            style={{
              left: `${(i * 29) % 100}%`,
              animationDelay: `${(i % 14) * 0.07}s`,
              animationDuration: `${2 + (i % 6) * 0.3}s`,
              background: ['#ffd23f', '#2f7bff', '#22c55e', '#ff5a5f', '#a78bfa', '#38bdf8'][i % 6],
              transform: `rotate(${i * 31}deg)`,
            }}
          />
        ))}
      </div>
      <div className="victory-in">
        <span className="victory-kicker">{t('Treino feito')}</span>
        <span className="victory-trophy">
          <Icon name="trophy" size={64} stroke={1.8} />
        </span>
        <h1>{t(line)}</h1>
        <div className="victory-week">
          {days.map((d) => {
            const k = ymd(d)
            const on = trainedOn(s, k) >= 1
            return (
              <span key={k} className={`vw ${on ? 'on' : ''} ${k === key ? 'now' : ''}`}>
                <i>{on ? <Icon name="check" size={16} stroke={3} /> : null}</i>
                <small>{weekdayShort(d.getDay())}</small>
              </span>
            )
          })}
        </div>
        <p className="victory-sub">{count === 1 ? t('1 treino nesta semana') : t('{n} treinos nesta semana', { n: count })}{st > 1 ? ` · ${t('{n} dias sem falhar', { n: st })}` : ''}</p>
        {letter && (
          <blockquote className="victory-letter">
            <small>{t('Você escreveu:')}</small>“{letter}”
          </blockquote>
        )}
        <button type="button" className="victory-btn" onClick={onClose}>
          {t('Bora!')}
        </button>
      </div>
    </div>
  )
}
