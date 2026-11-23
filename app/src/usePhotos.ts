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
  const chosen = s.introMeId
  useEffect(() => {
    let alive = true
    const localAvatar = s.profile.avatarId
    if (chosen) getPhoto(chosen).then((u) => alive && setUrl(u ?? null))
    else if (latestId) getPhoto(latestId).then((u) => alive && setUrl(u ?? null))
    else if (s.startPhotoId) getPhoto(s.startPhotoId).then((u) => alive && setUrl(u ?? null))
    else if (localAvatar) getPhoto(localAvatar).then((u) => alive && setUrl(u ?? (userId && hasAvatar ? avatarUrl(userId) : null)))
    else setUrl(userId && hasAvatar ? avatarUrl(userId) : null)
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen, latestId, userId, hasAvatar, s.profile.avatarId, s.startPhotoId])
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

/** URL de uma foto guardada no aparelho. */
export function usePhotoUrl(id?: string) {
  const [url, setUrl] = useState<string | null>(null)
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
