import { useState } from 'react'
import { t, weekdayShort } from '../i18n'
import { fmtDayMonth } from '../store'

/** Barras da semana (uma série). Toque numa barra mostra o valor. */
export function WeekBars({
  days,
  values,
  max,
  unit,
  goalLine,
}: {
  days: Date[]
  values: (number | null)[]
  max: number
  unit: string
  goalLine?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const H = 92
  const todayIdx = days.findIndex((d) => d.toDateString() === new Date().toDateString())
  return (
    <div className="wb">
      <div className="wb-plot" style={{ height: H }}>
        {goalLine != null && (
          <div className="wb-goal" style={{ bottom: (goalLine / max) * H }}>
            <span>{t('meta')} {goalLine}</span>
          </div>
        )}
        {values.map((v, i) => (
          <button
            key={i}
            type="button"
            className={`wb-col ${hover === i ? 'is-hover' : ''}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => setHover(hover === i ? null : i)}
            aria-label={`${fmtDayMonth(days[i])}: ${v == null ? t('sem registro') : v + ' ' + unit}`}
          >
            {v == null ? (
              <span className="wb-empty" />
            ) : (
              <span className="wb-bar" style={{ height: Math.max(3, (Math.min(v, max) / max) * H) }} />
            )}
            {hover === i && (
              <span className="wb-tip">
                <b>{v == null ? '—' : v}</b> {v == null ? t('sem registro') : unit}
                <small>{fmtDayMonth(days[i])}</small>
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="wb-axis">
        {days.map((d, i) => (
          <span key={i} className={i === todayIdx ? 'is-today' : ''}>
            {weekdayShort(d.getDay())}
          </span>
        ))}
      </div>
    </div>
  )
}
