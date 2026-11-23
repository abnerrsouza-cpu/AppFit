// Fotos usadas na abertura e no início: a mais recente da pessoa e a de referência.
import { useEffect, useState } from 'react'
import { avatarUrl } from './api'
import { getPhoto } from './photos'
import { type AppState, getProjeto } from './store'

/** Foto mais recente: última foto do check-in semanal; se não houver, a foto de perfil. */
export function useLatestPhoto(s: AppState, userId?: number, hasAvatar?: boolean) {
  const [url, setUrl] = useState<string | null>(null)
  const latestId = Object.values(s.weekly)
    .filter((w) => w.photoId)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0]?.photoId
  useEffect(() => {
    let alive = true
    if (latestId) getPhoto(latestId).then((u) => alive && setUrl(u ?? null))
    else setUrl(userId && hasAvatar ? avatarUrl(userId) : null)
    return () => {
      alive = false
    }
  }, [latestId, userId, hasAvatar])
  return url
}

/** Foto de referência (Projetinho > Expectativa). */
export function useRefPhoto(s: AppState) {
  const [url, setUrl] = useState<string | null>(null)
  const id = getProjeto(s).vision.photoId
  useEffect(() => {
    let alive = true
    if (id) getPhoto(id).then((u) => alive && setUrl(u ?? null))
    else setUrl(null)
    return () => {
      alive = false
    }
  }, [id])
  return url
}
