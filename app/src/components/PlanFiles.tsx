// Arquivos da ficha/dieta guardados no aparelho: abre a foto em tela cheia ou o PDF no leitor do celular.
import { useState } from 'react'
import { t } from '../i18n'
import { getPhoto } from '../photos'
import type { PlanFile } from '../store'
import { Icon } from './Icon'

async function toBlobUrl(dataUrl: string) {
  const b = await (await fetch(dataUrl)).blob()
  return URL.createObjectURL(b)
}

export function PlanFiles({ files, onRemove }: { files: PlanFile[]; onRemove?: (id: string) => void }) {
  const [img, setImg] = useState<string | null>(null)
  const open = async (f: PlanFile) => {
    const data = await getPhoto(f.id)
    if (!data) return alert(t('Esse arquivo não está neste celular. Envie de novo por aqui.'))
    if (f.type.startsWith('image/')) return setImg(data)
    const url = await toBlobUrl(data)
    const w = window.open(url, '_blank')
    if (!w) location.href = url
  }
  return (
    <>
      <ul className="pf-list">
        {files.map((f) => (
          <li key={f.id}>
            <button type="button" className="pf-open" onClick={() => open(f)}>
              <span className="pf-ic">
                <Icon name={f.type.startsWith('image/') ? 'camera' : 'file'} size={18} />
              </span>
              <span className="pf-name">
                <b>{f.name}</b>
                <small>{f.type.startsWith('image/') ? t('Foto · toque para abrir') : t('PDF · toque para abrir')}</small>
              </span>
            </button>
            {onRemove && (
              <button type="button" className="pf-del" onClick={() => confirm(t('Remover este arquivo?')) && onRemove(f.id)} aria-label={t('Remover')}>
                <Icon name="x" size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {img && (
        <div className="pf-view" role="dialog" onClick={() => setImg(null)}>
          <img src={img} alt="" />
          <button type="button" className="pf-close" aria-label={t('Fechar')}>
            <Icon name="x" size={20} />
          </button>
        </div>
      )}
    </>
  )
}
