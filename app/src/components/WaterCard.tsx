// Água do dia: um toque registra. Meta pelo peso (35 ml por kg, de meio em meio litro).
import { t } from '../i18n'
import { type AppState, currentWeight, setState, today } from '../store'
import { Icon } from './Icon'
import { toast } from './Toast'

export const waterGoal = (s: AppState) => Math.max(1500, Math.round((currentWeight(s) * 35) / 500) * 500)
const L = (ml: number) => (ml / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })

export function WaterCard({ s }: { s: AppState }) {
  const key = today()
  const ml = s.water?.[key] ?? 0
  const goal = waterGoal(s)
  const pct = Math.min(1, ml / goal)
  const add = (n: number) =>
    setState((x) => {
      const cur = Math.max(0, (x.water?.[key] ?? 0) + n)
      const hit = cur >= goal
      if (hit && !(x.water?.[key] && x.water[key] >= goal)) setTimeout(() => toast(t('Meta de água batida'), t('Seu corpo agradece.')), 50)
      return { ...x, water: { ...(x.water || {}), [key]: cur }, checks: { ...x.checks, [key]: { ...(x.checks[key] || {}), water: hit } } }
    })
  return (
    <section className={`card water ${pct >= 1 ? 'full' : ''}`}>
      <span className="water-bg" aria-hidden="true">
        <Icon name="droplet" size={150} stroke={1.4} />
      </span>
      <small className="water-k">{t('Água hoje')}</small>
      <div className="water-n">
        <b>{L(ml)}</b> <span>{t('L de {g} L', { g: L(goal) })}</span>
      </div>
      <div className="water-bar">
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <small className="water-sub">{pct >= 1 ? t('Meta batida. Continue se hidratando.') : t('Faltam {n} L', { n: L(goal - ml) })}</small>
      <div className="water-btns">
        {[250, 500, 1000].map((n) => (
          <button key={n} type="button" onClick={() => add(n)}>
            + {n < 1000 ? `${n} ml` : '1 L'}
          </button>
        ))}
      </div>
      {ml > 0 && (
        <button type="button" className="water-undo" onClick={() => add(-250)}>
          {t('Desfazer 250 ml')}
        </button>
      )}
    </section>
  )
}
