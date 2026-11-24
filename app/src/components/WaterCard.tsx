// Cartão de água no painel: litros bebidos, um toque para registrar e atalho para a aba de água.
import { t } from '../i18n'
import type { AppState } from '../store'
import { CONTAINERS, drink, fmtL, waterGoal, waterTotal } from '../water'
import { Icon } from './Icon'

export function WaterCard({ s, onOpen }: { s: AppState; onOpen?: () => void }) {
  const ml = waterTotal(s)
  const goal = waterGoal(s)
  const pct = Math.min(1, ml / goal)
  return (
    <section className={`card water ${pct >= 1 ? 'full' : ''}`}>
      <span className="water-bg" aria-hidden="true">
        <Icon name="droplet" size={150} stroke={1.4} />
      </span>
      <button type="button" className="water-open" onClick={onOpen}>
        <small className="water-k">{t('Água hoje')}</small>
        <span className="water-n">
          <b>{fmtL(ml)}</b> <span>{t('L de {g} L', { g: fmtL(goal) })}</span>
        </span>
      </button>
      <div className="water-bar">
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <small className="water-sub">{pct >= 1 ? t('Meta batida. Continue se hidratando.') : t('Faltam {n} L', { n: fmtL(goal - ml) })}</small>
      <div className="water-btns">
        {CONTAINERS.filter((c) => c.kind !== 'caneca').map((c) => (
          <button key={c.kind} type="button" onClick={() => drink(s, c.ml, c.kind)}>
            + {c.ml < 1000 ? `${c.ml} ml` : '1 L'}
          </button>
        ))}
      </div>
      {onOpen && (
        <button type="button" className="water-undo" onClick={onOpen}>
          {t('Ver controle de água')} <Icon name="arrow" size={14} />
        </button>
      )}
    </section>
  )
}
