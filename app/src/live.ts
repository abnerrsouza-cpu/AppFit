// Conteúdo vivo (vídeos dos canais). Começa com o retrato gravado no build e,
// se o app estiver publicado, busca a versão mais nova que o robô diário grava em content.json.
import { useEffect, useState } from 'react'
import snapshot from './content-snapshot.json'
import { t } from './i18n'

export interface LiveVideo {
  id: string
  title: string
  url: string
  published: string
  views: number
  channel: string
  lang: string
  short: boolean
}
export interface LiveContent {
  updatedAt: string
  channels: { name: string; id: string; url: string; lang: string }[]
  videos: LiveVideo[]
}

let cache: LiveContent = snapshot as LiveContent

export function useLiveContent() {
  const [c, setC] = useState<LiveContent>(cache)
  useEffect(() => {
    let alive = true
    fetch('./content.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: LiveContent | null) => {
        if (alive && j?.videos?.length && j.updatedAt > cache.updatedAt) {
          cache = j
          setC(j)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return c
}

export function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d <= 0) return t('hoje')
  if (d === 1) return t('ontem')
  if (d < 7) return t('há {n} dias', { n: d })
  const w = Math.floor(d / 7)
  return w === 1 ? t('há 1 semana') : t('há {n} semanas', { n: w })
}

export const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
