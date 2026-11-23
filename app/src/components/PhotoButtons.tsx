// Dois botões claros para foto: abrir a câmera ou escolher da galeria.
import { t } from '../i18n'
import { Icon } from './Icon'

export function PhotoButtons({ onFile, front = false, disabled = false, idPrefix }: { onFile: (f?: File) => void; front?: boolean; disabled?: boolean; idPrefix?: string }) {
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFile(e.target.files?.[0])
    e.target.value = ''
  }
  return (
    <div className={`photo-btns ${disabled ? 'off' : ''}`}>
      <label className="photo-btn">
        <input id={idPrefix ? `${idPrefix}-cam` : undefined} type="file" accept="image/*" capture={front ? 'user' : 'environment'} hidden disabled={disabled} onChange={handle} />
        <Icon name="camera" size={18} /> {t('Tirar foto')}
      </label>
      <label className="photo-btn">
        <input id={idPrefix ? `${idPrefix}-gal` : undefined} type="file" accept="image/*" hidden disabled={disabled} onChange={handle} />
        <Icon name="image" size={18} /> {t('Escolher da galeria')}
      </label>
    </div>
  )
}
