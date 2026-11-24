// Perfil > Fotos da abertura: escolher as duas fotos que aparecem quando o app abre.
import { useState } from 'react'
import { t } from '../i18n'
import { compress, putPhoto } from '../photos'
import { type AppState, newId, setProjeto, setState } from '../store'
import { useLatestPhoto, useRefPhoto } from '../usePhotos'
import { AiTip } from './AiTip'
import { Icon } from './Icon'
import { editPhoto } from './PhotoEditor'
import { PhotoButtons } from './PhotoButtons'
import { toast } from './Toast'

async function save(raw?: File) {
  const f = raw && (await editPhoto(raw, 3 / 4))
  if (!f) return null
  const id = newId()
  await putPhoto(id, await compress(f, 1100))
  return id
}

export function IntroPhotos({ s, userId, hasAvatar, onPreview }: { s: AppState; userId?: number; hasAvatar?: boolean; onPreview: () => void }) {
  const me = useLatestPhoto(s, userId, hasAvatar)
  const ref = useRefPhoto(s)
  const [busy, setBusy] = useState<'me' | 'ref' | null>(null)
  const pickMe = async (f?: File) => {
    setBusy('me')
    const id = await save(f)
    if (id) {
      setState((x) => ({ ...x, introMeId: id }))
      toast(t('Foto do "Esse é você" salva'))
    }
    setBusy(null)
  }
  const pickRef = async (f?: File) => {
    setBusy('ref')
    const id = await save(f)
    if (id) {
      setProjeto((p) => ({ ...p, vision: { ...p.vision, photoId: id } }))
      toast(t('Foto de referência salva'))
    }
    setBusy(null)
  }
  const Slot = ({ url, label, sub, onFile, k }: { url: string | null; label: string; sub: string; onFile: (f?: File) => void; k: 'me' | 'ref' }) => (
    <div className="ip-slot">
      <div className={`ip-img ${url ? 'ok' : ''}`}>
        {url ? <img src={url} alt="" /> : <Icon name="camera" size={30} />}
        <span className="ip-tag">{label}</span>
        {busy === k && <span className="ip-busy">{t('Salvando...')}</span>}
      </div>
      <small className="muted">{sub}</small>
      <PhotoButtons onFile={onFile} disabled={!!busy} />
    </div>
  )
  return (
    <div className="form">
      <h1 className="ttl">{t('Fotos da abertura')}</h1>
      <p className="lead">{t('São as duas fotos que aparecem toda vez que você abre o app: primeiro você hoje, depois o corpo que você quer.')}</p>
      <Slot
        k="me"
        url={me}
        label={t('Esse é você')}
        sub={s.introMeId ? t('Foto escolhida por você.') : t('Agora: a foto mais recente do check-in semanal, ou a foto de perfil.')}
        onFile={pickMe}
      />
      {s.introMeId && (
        <button
          type="button"
          className="link"
          onClick={() => {
            setState((x) => ({ ...x, introMeId: undefined }))
            toast(t('Voltou para a foto mais recente do check-in'))
          }}
        >
          {t('Usar sempre a foto mais recente do check-in')}
        </button>
      )}
      <Slot k="ref" url={ref} label={t('Essa é sua referência')} sub={t('O shape que você quer ter. É a mesma foto do topo do Projetinho.')} onFile={pickRef} />
      <AiTip profile={s.profile} compact />
      <button type="button" className="cta ip-preview" onClick={onPreview}>
        <Icon name="play" size={18} /> {t('Ver a abertura')}
      </button>
    </div>
  )
}
