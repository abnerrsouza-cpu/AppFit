import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { t } from '../i18n'

/** Botão "i": toca e aparece um balão curto explicando o título ou a ação ao lado. */
export function Info({ text, light = false }: { text: string; light?: boolean }) {
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null)

  useEffect(() => {
    if (!pos) return
    const close = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return
      setPos(null)
    }
    const other = (e: Event) => (e as CustomEvent).detail !== id && setPos(null)
    const opened = Date.now()
    const hide = () => Date.now() - opened > 400 && setPos(null)
    document.addEventListener('pointerdown', close)
    window.addEventListener('info-open', other)
    window.addEventListener('scroll', hide, { capture: true })
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('info-open', other)
      window.removeEventListener('scroll', hide, { capture: true })
      window.removeEventListener('resize', hide)
    }
  }, [pos, id])

  const toggle = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (pos) return setPos(null)
    const r = ref.current!.getBoundingClientRect()
    const up = r.bottom > window.innerHeight - 170
    setPos({ x: r.left + r.width / 2, y: up ? r.top - 8 : r.bottom + 8, up })
    window.dispatchEvent(new CustomEvent('info-open', { detail: id }))
  }

  const W = Math.min(260, window.innerWidth - 24)
  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      className={`info ${light ? 'light' : ''} ${pos ? 'open' : ''}`}
      aria-label={t('O que é isso?')}
      aria-expanded={!!pos}
      onClick={toggle}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(e)}
    >
      i
      {pos && (
        <span
          role="tooltip"
          className={`info-pop ${pos.up ? 'up' : ''}`}
          style={{
            width: W,
            left: Math.max(12, Math.min(window.innerWidth - W - 12, pos.x - W / 2)),
            ...(pos.up ? { bottom: window.innerHeight - pos.y } : { top: pos.y }),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </span>
      )}
    </span>
  )
}

/** Coloca o "i" à direita de um botão grande. */
export function WithInfo({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="with-info">
      {children}
      <Info text={text} />
    </div>
  )
}
