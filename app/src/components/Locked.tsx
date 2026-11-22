import { t } from '../i18n'
import { Icon } from './Icon'

/** Card vermelho de função bloqueada: diz o que falta fazer e leva até lá. */
export function Locked({
  icon,
  title,
  text,
  progress,
  onClick,
}: {
  icon: string
  title: string
  text: string
  progress?: [number, number]
  onClick?: () => void
}) {
  return (
    <button type="button" className="card alert-card locked" onClick={onClick}>
      <span className="locked-ic">
        <Icon name={icon} size={22} />
        <i>
          <Icon name="lock" size={11} stroke={2.6} />
        </i>
      </span>
      <span className="locked-txt">
        <b>{title}</b>
        <small>{text}</small>
        {progress && (
          <span className="locked-prog">
            <span className="locked-bar">
              <span style={{ width: `${(progress[0] / progress[1]) * 100}%` }} />
            </span>
            <small>{t('{a} de {b}', { a: progress[0], b: progress[1] })}</small>
          </span>
        )}
      </span>
      <Icon name="chevR" />
    </button>
  )
}
