import { useEffect, useState } from 'react'
import { editPhoto } from './PhotoEditor'
import { api, avatarUrl } from '../api'
import { t } from '../i18n'
import { isServerMode } from '../notify'
import { compress, getPhoto, putPhoto } from '../photos'
import { newId, setState } from '../store'
import { Icon } from './Icon'
import { PhotoButtons } from './PhotoButtons'
import { toast } from './Toast'

/**
 * Foto de perfil: guarda no celular (profile.avatarId) e, com conta, também no servidor.
 * `big` mostra o bloco grande com texto (cadastro); sem `big`, só o círculo com câmera.
 */
export function AvatarPicker({
  avatarId,
  userId,
  hasServerAvatar,
  name,
  big = false,
  onSaved,
}: {
  avatarId?: string
  userId?: number
  hasServerAvatar?: boolean
  name: string
  big?: boolean
  onSaved?: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    if (avatarId) getPhoto(avatarId).then((u) => alive && setUrl(u ?? null))
    else setUrl(userId && hasServerAvatar ? avatarUrl(userId) : null)
    return () => {
      alive = false
    }
  }, [avatarId, userId, hasServerAvatar])

  const pick = async (raw?: File) => {
    const f = raw && (await editPhoto(raw, 1, true))
    if (!f) return
    setBusy(true)
    setErr('')
    try {
      const data = await compress(f, 320)
      const id = newId()
      await putPhoto(id, data)
      setUrl(data)
      setState((st) => ({ ...st, profile: { ...st.profile, avatarId: id } }))
      if (isServerMode()) await api.setAvatar(data).catch(() => {})
      onSaved?.()
      toast(t('Foto de perfil salva'))
    } catch {
      setErr(t('Não consegui abrir essa foto. Tente outra.'))
    } finally {
      setBusy(false)
    }
  }

  const circle = (
    <span className={`avatar-big ${url ? 'has' : ''}`}>
      {url ? <img src={url} alt="" /> : name ? <span className="avatar-initial">{name.slice(0, 1).toUpperCase()}</span> : <Icon name="camera" size={28} />}
      <i className="avatar-edit">
        <Icon name="camera" size={12} />
      </i>
    </span>
  )

  if (!big)
    return (
      <label className="avatar-pick compact" aria-label={t('Trocar foto de perfil')}>
        <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
        {circle}
      </label>
    )

  return (
    <div className="photo-wrap">
    <label className="avatar-pick">
      <input id="ob-avatar" type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
      {circle}
      <span>
        <b>{busy ? t('Salvando...') : url ? t('Trocar foto de perfil') : t('Adicione sua foto de perfil')}</b>
        <small>{err || t('Uma foto do seu rosto. Ela aparece no início e na abertura do app.')}</small>
      </span>
    </label>
    <PhotoButtons front onFile={pick} disabled={busy} />
    </div>
  )
}
