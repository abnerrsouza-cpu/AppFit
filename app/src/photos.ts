import { t } from './i18n'
// Fotos ficam no IndexedDB do aparelho (localStorage é pequeno demais).
// Na versão com servidor: bucket privado no Supabase Storage.

const DB = 'semdesculpa-fotos'
const STORE = 'fotos'

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

export async function putPhoto(id: string, dataUrl: string) {
  try {
    const db = await open()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(dataUrl, id)
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
  } catch {
    memory.set(id, dataUrl)
  }
}

const memory = new Map<string, string>()

export async function getPhoto(id: string): Promise<string | undefined> {
  if (id.startsWith('demo-')) return demoPhoto(id)
  if (memory.has(id)) return memory.get(id)
  try {
    const db = await open()
    return await new Promise((res) => {
      const r = db.transaction(STORE).objectStore(STORE).get(id)
      r.onsuccess = () => res(r.result as string | undefined)
      r.onerror = () => res(undefined)
    })
  } catch {
    return undefined
  }
}

/** Reduz a foto para ~900px no lado maior antes de salvar. */
export function compress(file: File, max = 900): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      res(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = rej
    img.src = url
  })
}

// Fotos de exemplo desenhadas no canvas: uma silhueta mais larga e outra mais seca.
const demoCache = new Map<string, string>()
function demoPhoto(id: string): string {
  if (demoCache.has(id)) return demoCache.get(id)!
  const before = id === 'demo-before'
  const W = 600
  const H = 800
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, before ? '#3a3f4a' : '#4a3a32')
  bg.addColorStop(1, before ? '#1d2027' : '#22181a')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  // chão
  g.fillStyle = 'rgba(0,0,0,.25)'
  g.beginPath()
  g.ellipse(W / 2, H - 70, 170, 26, 0, 0, Math.PI * 2)
  g.fill()

  const waist = before ? 118 : 88
  const shoulder = before ? 150 : 158
  g.fillStyle = before ? '#c9a58c' : '#c69a7c'
  // cabeça
  g.beginPath()
  g.arc(W / 2, 170, 52, 0, Math.PI * 2)
  g.fill()
  // pescoço
  g.fillRect(W / 2 - 22, 210, 44, 40)
  // tronco
  g.beginPath()
  g.moveTo(W / 2 - shoulder, 270)
  g.quadraticCurveTo(W / 2, 236, W / 2 + shoulder, 270)
  g.lineTo(W / 2 + waist + (before ? 18 : 0), 470)
  g.lineTo(W / 2 + waist - 6, 540)
  g.lineTo(W / 2 - waist + 6, 540)
  g.lineTo(W / 2 - waist - (before ? 18 : 0), 470)
  g.closePath()
  g.fill()
  // braços
  g.lineCap = 'round'
  g.strokeStyle = g.fillStyle
  g.lineWidth = before ? 50 : 54
  g.beginPath()
  g.moveTo(W / 2 - shoulder + 10, 290)
  g.lineTo(W / 2 - shoulder - 26, 500)
  g.moveTo(W / 2 + shoulder - 10, 290)
  g.lineTo(W / 2 + shoulder + 26, 500)
  g.stroke()
  // short
  g.fillStyle = '#1a1a1a'
  g.fillRect(W / 2 - waist + 2, 530, waist * 2 - 4, 120)
  // pernas
  g.fillStyle = before ? '#c9a58c' : '#c69a7c'
  g.fillRect(W / 2 - waist + 10, 650, waist - 22, 90)
  g.fillRect(W / 2 + 12, 650, waist - 22, 90)
  if (!before) {
    // linhas de definição
    g.strokeStyle = 'rgba(80,40,25,.35)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(W / 2, 300)
    g.lineTo(W / 2, 520)
    for (const y of [380, 425, 470]) {
      g.moveTo(W / 2 - 40, y)
      g.lineTo(W / 2 + 40, y)
    }
    g.moveTo(W / 2 - 90, 330)
    g.quadraticCurveTo(W / 2 - 45, 360, W / 2 - 4, 330)
    g.moveTo(W / 2 + 90, 330)
    g.quadraticCurveTo(W / 2 + 45, 360, W / 2 + 4, 330)
    g.stroke()
  }
  g.fillStyle = 'rgba(255,255,255,.85)'
  g.font = '600 30px Poppins, system-ui, sans-serif'
  g.fillText(before ? t('EXEMPLO · SEMANA 1') : t('EXEMPLO · SEMANA 6'), 28, 52)
  const url = c.toDataURL('image/jpeg', 0.85)
  demoCache.set(id, url)
  return url
}
