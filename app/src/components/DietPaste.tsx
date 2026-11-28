// Colar o texto da dieta: o app separa as refeições sozinho, a pessoa confere e usa.
import { useState } from 'react'
import { parseDietText } from '../dietText'
import { t } from '../i18n'
import { type Profile, newId } from '../store'
import { Icon } from './Icon'
import { toast } from './Toast'

export function DietPaste({ p, upd }: { p: Profile; upd: (patch: Partial<Profile>) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const res = text.trim() ? parseDietText(text, p) : null
  const apply = () => {
    if (!res) return
    const tasks = (p.tasks || []).filter((x) => !res.supplements.some((s) => s.toLowerCase().split(' ')[0] === x.title.toLowerCase().split(' ')[0]))
    const first = res.meals[0]?.time || p.wake
    upd({
      meals: res.meals.map((m) => ({ id: newId(), ...m })),
      dietMode: 'ficha',
      ...(res.waterMl ? { waterGoalMl: res.waterMl } : {}),
      tasks: [...tasks, ...res.supplements.map((title) => ({ id: newId(), time: first, title }))].sort((a, b) => a.time.localeCompare(b.time)),
    })
    toast(t('Dieta cadastrada'), t('{n} refeições com horário. Confira e ajuste abaixo.', { n: res.meals.length }))
    setText('')
    setOpen(false)
  }
  if (!open)
    return (
      <button type="button" className="ghost-btn dp-open" onClick={() => setOpen(true)}>
        <Icon name="list" size={18} /> {t('Colar o texto da dieta')}
      </button>
    )
  return (
    <div className="card pdf-card dp">
      <b>{t('Cole aqui o texto da sua dieta')}</b>
      <small className="muted">{t('Abra o PDF, segure o dedo no texto, selecione tudo, copie e cole abaixo. O app separa as refeições sozinho.')}</small>
      <textarea id="dp-text" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Café da manhã:\n- 2 ovos\n- 1 pão\n\nAlmoço:\n- 150g de arroz\n- 160g de carne'} />
      {res && (
        <>
          {res.meals.length ? (
            <ul className="pdf-list">
              {res.meals.map((m, i) => (
                <li key={i}>
                  <span className="pdf-tag">{m.time}</span>
                  <div>
                    <b>{m.name}</b>
                    <small>{m.items.split('\n').join(' · ')}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <small className="pdf-msg bad-msg">{t('Não achei refeições. Confira se cada refeição tem um título como "Almoço:".')}</small>
          )}
          {(res.waterMl || res.supplements.length > 0) && (
            <p className="dp-extra">
              {res.waterMl ? t('Meta de água: {l} L por dia.', { l: String(res.waterMl / 1000).replace('.', ',') }) + ' ' : ''}
              {res.supplements.length ? t('Afazeres: {s}.', { s: res.supplements.join(', ') }) : ''}
            </p>
          )}
          <button type="button" className="cta" disabled={!res.meals.length} onClick={apply}>
            {t('Usar esta dieta')}
          </button>
        </>
      )}
      <button type="button" className="link" onClick={() => setOpen(false)}>
        {t('Cancelar')}
      </button>
    </div>
  )
}
