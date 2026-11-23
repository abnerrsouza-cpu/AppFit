import { t } from '../i18n'
import { Icon } from './Icon'

/** Comemoração em tela cheia: medalha nova ou subida de nível, com confete. */
export function Celebrate({ kind, icon, title, desc, onClose, kicker, button, top = false }: { kind: 'medal' | 'level'; icon: string; title: string; desc: string; onClose: () => void; kicker?: string; button?: string; top?: boolean }) {
  const pieces = Array.from({ length: 36 }, (_, i) => i)
  return (
    <div className={`celebrate ${top ? 'top' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="confetti" aria-hidden="true">
        {pieces.map((i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 12) * 0.08}s`,
              animationDuration: `${2.2 + (i % 5) * 0.35}s`,
              background: ['#2f7bff', '#ffb020', '#22c55e', '#ef4444', '#a78bfa', '#38bdf8'][i % 6],
              transform: `rotate(${i * 23}deg)`,
            }}
          />
        ))}
      </div>
      <div className="celebrate-card">
        <span className="celebrate-kicker">{kicker ?? (kind === 'medal' ? t('Medalha conquistada') : t('Você subiu de nível'))}</span>
        <span className={`celebrate-medal ${kind === 'level' ? 'level' : ''}`}>
          <Icon name={icon} size={46} stroke={2} />
        </span>
        <h1>{title}</h1>
        <p>{desc}</p>
        <button type="button" className="cta" onClick={onClose}>
          {button ?? t('Continuar')}
        </button>
      </div>
    </div>
  )
}
