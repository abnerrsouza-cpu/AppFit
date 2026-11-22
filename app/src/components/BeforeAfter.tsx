import { useEffect, useRef, useState } from 'react'
import { getPhoto } from '../photos'

/** Duas fotos sobrepostas. Arrastar a linha revela a foto 1 ou a 2. */
export function BeforeAfter({
  beforeId,
  afterId,
  beforeLabel,
  afterLabel,
  compact = false,
}: {
  beforeId?: string
  afterId?: string
  beforeLabel: string
  afterLabel: string
  compact?: boolean
}) {
  const [a, setA] = useState<string>()
  const [b, setB] = useState<string>()
  const [pos, setPos] = useState(50)
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  useEffect(() => {
    let alive = true
    if (beforeId) getPhoto(beforeId).then((u) => alive && setA(u))
    if (afterId) getPhoto(afterId).then((u) => alive && setB(u))
    return () => {
      alive = false
    }
  }, [beforeId, afterId])

  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }

  if (!a || !b) {
    return (
      <div className={`ba ba-empty ${compact ? 'ba-compact' : ''}`}>
        <span>Envie pelo menos duas fotos semanais para ver o antes e depois.</span>
      </div>
    )
  }

  return (
    <div
      ref={box}
      className={`ba ${compact ? 'ba-compact' : ''}`}
      onPointerDown={(e) => {
        dragging.current = true
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        move(e.clientX)
      }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <img src={b} alt={afterLabel} draggable={false} />
      <div className="ba-top" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={a} alt={beforeLabel} draggable={false} />
      </div>
      <div className="ba-line" style={{ left: `${pos}%` }}>
        <span className="ba-knob" />
      </div>
      <span className="ba-tag ba-tag-l">{beforeLabel}</span>
      <span className="ba-tag ba-tag-r">{afterLabel}</span>
      <input
        className="ba-range"
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Comparar antes e depois"
      />
    </div>
  )
}
