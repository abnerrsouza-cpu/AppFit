// Ajustar foto antes de salvar: arrastar, aproximar (pinça ou barra), girar.
// Uso: const ajustada = await editPhoto(file, 3 / 4) — devolve null se a pessoa cancelar.
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { t } from '../i18n'
import { Icon } from './Icon'

export function editPhoto(file: File, aspect = 3 / 4, round = false): Promise<File | null> {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const done = (f: File | null) => {
      root.unmount()
      host.remove()
      resolve(f)
    }
    root.render(<PhotoEditor file={file} aspect={aspect} round={round} onDone={done} />)
  })
}

function PhotoEditor({ file, aspect, round, onDone }: { file: File; aspect: number; round: boolean; onDone: (f: File | null) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [err, setErr] = useState(false)
  const [rot, setRot] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d: number; z: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const im = new Image()
    im.onload = () => setImg(im)
    im.onerror = () => setErr(true)
    im.src = url
    document.body.style.overflow = 'hidden'
    return () => {
      URL.revokeObjectURL(url)
      document.body.style.overflow = ''
    }
  }, [file])

  // tamanho da moldura
  const vw = Math.min(window.innerWidth - 32, 440)
  const vh = window.innerHeight - 290
  let fw = vw
  let fh = fw / aspect
  if (fh > vh) {
    fh = vh
    fw = fh * aspect
  }

  const iw = img?.naturalWidth || 1
  const ih = img?.naturalHeight || 1
  const sideways = rot % 180 !== 0
  const rw = sideways ? ih : iw
  const rh = sideways ? iw : ih
  const base = Math.max(fw / rw, fh / rh)
  const s = base * zoom
  const maxX = Math.max(0, (rw * s - fw) / 2)
  const maxY = Math.max(0, (rh * s - fh) / 2)
  const clamp = (p: { x: number; y: number }) => ({ x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-maxY, Math.min(maxY, p.y)) })
  const cur = clamp(pos)

  const onDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }
    }
  }
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      setZoom(Math.max(1, Math.min(4, (pinch.current.z * d) / pinch.current.d)))
    } else if (pointers.current.size === 1) {
      setPos((p) => clamp({ x: clamp(p).x + e.clientX - prev.x, y: clamp(p).y + e.clientY - prev.y }))
    }
  }
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  const save = async () => {
    if (!img) return
    setBusy(true)
    const outW = round ? 640 : 1080
    const outH = Math.round(outW / aspect)
    const k = outW / fw
    const c = document.createElement('canvas')
    c.width = outW
    c.height = outH
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, outW, outH)
    ctx.translate(outW / 2 + cur.x * k, outH / 2 + cur.y * k)
    ctx.rotate((rot * Math.PI) / 180)
    ctx.scale(s * k, s * k)
    ctx.drawImage(img, -iw / 2, -ih / 2)
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.9))
    onDone(blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file)
  }

  return (
    <div className="ped" role="dialog" aria-modal="true" aria-label={t('Ajuste sua foto')}>
      <div className="ped-top">
        <button type="button" className="ped-x" onClick={() => onDone(null)} aria-label={t('Cancelar')}>
          <Icon name="x" size={20} />
        </button>
        <b>{t('Ajuste sua foto')}</b>
        <span style={{ width: 40 }} />
      </div>

      <div className="ped-stage">
        {err ? (
          <p className="ped-err">{t('Não consegui abrir essa foto. Tente outra.')}</p>
        ) : (
          <div
            className={`ped-frame ${round ? 'round' : ''}`}
            style={{ width: fw, height: fh }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onWheel={(e) => setZoom((z) => Math.max(1, Math.min(4, z - e.deltaY * 0.002)))}
          >
            {img && (
              <img
                src={img.src}
                alt=""
                draggable={false}
                style={{ width: iw, height: ih, transform: `translate(-50%, -50%) translate(${cur.x}px, ${cur.y}px) rotate(${rot}deg) scale(${s})` }}
              />
            )}
            <span className="ped-grid" aria-hidden="true" />
          </div>
        )}
      </div>

      <p className="ped-hint">{t('Arraste para posicionar. Use dois dedos ou a barra para aproximar.')}</p>
      <div className="ped-tools">
        <Icon name="image" size={16} />
        <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label={t('Aproximar')} />
        <Icon name="image" size={22} />
        <button type="button" className="ped-rot" onClick={() => setRot((r) => (r + 90) % 360)} aria-label={t('Girar')}>
          <Icon name="refresh" size={20} />
        </button>
      </div>
      <div className="ped-actions">
        <button type="button" className="ped-cancel" onClick={() => onDone(null)}>
          {t('Cancelar')}
        </button>
        <button type="button" className="cta" onClick={save} disabled={!img || busy}>
          <Icon name="check" size={18} stroke={3} /> {t('Usar foto')}
        </button>
      </div>
    </div>
  )
}
