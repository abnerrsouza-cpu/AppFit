// Afazeres extras da rotina: "+ Novo afazer" com horário, exemplos prontos e PDF.
import { useRef } from 'react'
import { t } from '../i18n'
import { type Profile, type RoutineTask, newId } from '../store'
import { Icon } from './Icon'
import { PdfImport } from './PdfImport'

const EXAMPLES: [string, string][] = [
  ['Beber 500 ml de água', '09:00'],
  ['Tomar creatina', '08:00'],
  ['Caminhar 20 minutos', '07:00'],
  ['Alongar 10 minutos', '22:00'],
  ['Meditar 5 minutos', '06:45'],
]

export function RoutineTasks({ tasks = [], upd, online, lang }: { tasks?: RoutineTask[]; upd: (patch: Partial<Profile>) => void; online: boolean; lang: string }) {
  const list = useRef<HTMLDivElement>(null)
  const save = (next: RoutineTask[]) => upd({ tasks: next })
  const add = (title = '', time = '12:00') => {
    const id = newId()
    save([...tasks, { id, time, title }])
    if (!title) setTimeout(() => list.current?.querySelector<HTMLInputElement>(`[data-id="${id}"]`)?.focus(), 50)
  }
  const set = (id: string, patch: Partial<RoutineTask>) => save(tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const unused = EXAMPLES.filter(([x]) => !tasks.some((k) => k.title === t(x)))

  return (
    <div className="rtasks">
      <b className="rtasks-h">{t('Outros afazeres do seu dia')}</b>
      <small className="muted">{t('Água, suplemento, caminhada, estudo... Cada afazer aparece em Seu dia e vira uma cobrança no horário.')}</small>
      <div ref={list} className="rtasks-list">
        {tasks.map((x) => (
          <div key={x.id} className="rtask card">
            <input type="time" value={x.time} onChange={(e) => set(x.id, { time: e.target.value })} aria-label={t('Horário')} />
            <input data-id={x.id} value={x.title} onChange={(e) => set(x.id, { title: e.target.value })} placeholder={t('Ex.: tomar creatina')} />
            <button type="button" className="rtask-x" onClick={() => save(tasks.filter((k) => k.id !== x.id))} aria-label={t('Remover')}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="ghost-btn rtasks-add" onClick={() => add()}>
        <Icon name="plus" size={18} /> {t('Novo afazer')}
      </button>
      {unused.length > 0 && (
        <div className="examples">
          <small>{t('Toque para adicionar:')}</small>
          <div>
            {unused.map(([x, h]) => (
              <button key={x} type="button" className="ex-chip" onClick={() => add(t(x), h)}>
                + {t(x)}
              </button>
            ))}
          </div>
        </div>
      )}
      <PdfImport kind="routine" online={online} lang={lang} upd={upd} />
    </div>
  )
}
