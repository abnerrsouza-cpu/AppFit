import { t } from '../i18n'
import { Icon } from './Icon'

export type Tab = 'inicio' | 'evolucao' | 'projeto' | 'cobrancas' | 'menu' | 'admin' | 'conquistas' | 'ranking' | 'plano'

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Hoje', icon: 'sun' },
  { id: 'plano', label: 'Treino e dieta', icon: 'dumbbell' },
  { id: 'evolucao', label: 'Evolução', icon: 'photo' },
  { id: 'projeto', label: 'Projetinho', icon: 'star' },
  { id: 'ranking', label: 'Ranking', icon: 'trophy' },
  { id: 'menu', label: 'Perfil', icon: 'user' },
]

export function BottomNav({ tab, onTab, dots, admin = false }: { tab: Tab; onTab: (t: Tab) => void; dots: Partial<Record<Tab, boolean>>; admin?: boolean }) {
  // o Admin fica no Perfil, para o rodapé não passar de 6 abas
  void admin
  const items = ITEMS
  return (
    <nav className="bnav n6" aria-label={t('Navegação principal')}>
      {items.map((it) => (
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
          <span>{t(it.label)}</span>
        </button>
      ))}
    </nav>
  )
}
