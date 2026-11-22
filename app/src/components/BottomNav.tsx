import { Icon } from './Icon'

export type Tab = 'inicio' | 'dia' | 'noticias' | 'evolucao' | 'cobrancas' | 'menu'

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'dia', label: 'Seu dia', icon: 'sun' },
  { id: 'noticias', label: 'Notícias', icon: 'news' },
  { id: 'evolucao', label: 'Evolução', icon: 'photo' },
  { id: 'menu', label: 'Menu', icon: 'menu' },
]

export function BottomNav({ tab, onTab, dots }: { tab: Tab; onTab: (t: Tab) => void; dots: Partial<Record<Tab, boolean>> }) {
  return (
    <nav className="bnav" aria-label="Navegação principal">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          type="button"
          className={`bnav-item ${tab === it.id ? 'is-active' : ''}`}
          onClick={() => onTab(it.id)}
          aria-current={tab === it.id ? 'page' : undefined}
        >
          <span className="bnav-icon">
            <Icon name={it.icon} size={24} stroke={1.8} />
            {dots[it.id] && <i className="bnav-dot" />}
          </span>
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  )
}
