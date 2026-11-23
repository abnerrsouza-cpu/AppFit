// Aviso rápido no topo da tela ("Foto salva", "Semana fechada"...).
import { useEffect, useState } from 'react'
import { Icon } from './Icon'

type Msg = { id: number; text: string; sub?: string }
let push: ((m: Msg) => void) | null = null
let seq = 0

export function toast(text: string, sub?: string) {
  push?.({ id: ++seq, text, sub })
}

export function Toaster() {
  const [list, setList] = useState<Msg[]>([])
  useEffect(() => {
    push = (m) => {
      setList([m])
      navigator.vibrate?.(30)
      setTimeout(() => setList((l) => l.filter((x) => x.id !== m.id)), 3200)
    }
    return () => {
      push = null
    }
  }, [])
  return (
    <div className="toasts" aria-live="polite">
      {list.map((m) => (
        <div key={m.id} className="toast">
          <span className="toast-ic">
            <Icon name="check" size={16} stroke={3} />
          </span>
          <span>
            <b>{m.text}</b>
            {m.sub && <small>{m.sub}</small>}
          </span>
        </div>
      ))}
    </div>
  )
}
