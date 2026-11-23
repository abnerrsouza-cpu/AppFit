// Quando algo só funciona com conta: diz o porquê e leva direto para criar a conta.
import { t } from '../i18n'
import { Icon } from './Icon'

export const APP_URL = 'https://appfit-production.up.railway.app'
const go = (mode: 'criar' | 'entrar') => location.assign(`${APP_URL}/?${mode}=1`)

export function LoginCta({ title, text, compact = false }: { title?: string; text?: string; compact?: boolean }) {
  if (compact)
    return (
      <div className="login-cta compact">
        <small>{text ?? t('Isso funciona na versão com conta.')}</small>
        <button type="button" className="link" onClick={() => go('criar')}>
          {t('Criar minha conta')} <Icon name="arrow" size={14} />
        </button>
      </div>
    )
  return (
    <section className="card login-cta">
      <span className="login-cta-ic">
        <Icon name="user" size={24} />
      </span>
      <b>{title ?? t('Crie sua conta para liberar')}</b>
      <p>{text ?? t('Com a conta, seus dados ficam salvos e você recebe as cobranças no celular.')}</p>
      <button type="button" className="cta" onClick={() => go('criar')}>
        {t('Criar minha conta')} <Icon name="arrow" size={18} />
      </button>
      <button type="button" className="link" onClick={() => go('entrar')}>
        {t('Já tenho conta: entrar')}
      </button>
    </section>
  )
}
