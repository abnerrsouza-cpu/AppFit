/** Anéis concêntricos de progresso do dia (0 a 1 cada). */
export function Rings({ values, size = 150 }: { values: { v: number; color: string }[]; size?: number }) {
  const stroke = size * 0.1
  const gap = stroke * 0.35
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rings" role="img" aria-label="Progresso do dia">
      {values.map((r, i) => {
        const radius = size / 2 - stroke / 2 - i * (stroke + gap)
        const c = 2 * Math.PI * radius
        const v = Math.max(0, Math.min(1, r.v))
        return (
          <g key={i} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={r.color} strokeOpacity={0.16} strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={r.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${c * v} ${c}`}
              className="ring-arc"
            />
          </g>
        )
      })}
    </svg>
  )
}
