// Pop-up do modo foco: só libera o resto do app depois do treino de hoje.
import { t } from '../i18n'
import { setState, today } from '../store'
import { Icon } from './Icon'
import { toast } from './Toast'

export function TrainGate({ onClose, onCoach }: { onClose: () => void; onCoach: () => void }) {
  const yes = () => {
    setState((x) => ({ ...x, checks: { ...x.checks, [today()]: { ...(x.checks[today()] || {}), train: true } } }))
    toast(t('Treino registrado. App liberado.'), t('Isso é disciplina.'))
    onClose()
  }
  return (
    <div className="gate" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="gate-card" onClick={(e) => e.stopPropagation()}>
        <span className="gate-ic">
          <Icon name="lock" size={26} />
        </span>
        <b>{t('Já registrou o treino de hoje aqui no app?')}</b>
        <p>{t('O resto do app abre depois do treino. Primeiro o que importa.')}</p>
        <button type="button" className="cta" onClick={yes}>
          <Icon name="check" size={18} stroke={3} /> {t('Sim, já treinei hoje')}
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            onClose()
            onCoach()
          }}
        >
          {t('Ainda não')}
        </button>
      </div>
    </div>
  )
}
