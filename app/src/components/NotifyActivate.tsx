// Convencer e conduzir a pessoa a ativar os avisos no celular.
// Mostra uma prévia real (com os dados dela), o que ela ganha e o passo a passo do aparelho.
import { t } from '../i18n'
import { isStandalone, notifyStatus, sendTest } from '../notify'
import { type AppState, planMeals, streak, today } from '../store'
import { Icon } from './Icon'
import { InstallStep, NotifyStep } from './InstallGuide'
import { toast } from './Toast'

export function NotifyActivate({ s, onGranted }: { s: AppState; onGranted: () => void }) {
  const p = s.profile
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const checks = s.checks[today()] || {}
  const meals = planMeals(p).sort((a, b) => a.time.localeCompare(b.time))
  const next = meals.find((m) => m.time > hhmm && !checks[m.id])
  const st = streak(s)
  // prévia com os dados da própria pessoa
  const preview = next
    ? { title: `${next.time} · ${next.name}`, body: next.items.trim() ? next.items.split(/\n|,\s+/).slice(0, 2).join(', ') + '.' : t('Marque no app quando comer.') }
    : { title: t('Preste contas: leva 1 minuto'), body: st > 0 ? t('Sequência de {n} dias em jogo.', { n: st }) : t('Faça o dia de hoje contar.') }
  const installed = isStandalone()
  const granted = notifyStatus() === 'granted'
  const done = async () => {
    const first = (p.name || '').split(' ')[0]
    toast(t('Avisos ativados'), t('Mandei um teste agora. Olhe a tela do celular.'))
    await sendTest(t('Pronto, {n}. Agora eu te cobro.', { n: first || t('você') }), t('Nos horários da sua rotina. Sem desculpa.'))
    onGranted()
  }
  return (
    <section className="card na">
      <span className="na-badge">
        <Icon name="bell" size={16} /> {t('Falta ativar')}
      </span>
      <h2>{t('Sem aviso no celular, eu não consigo te cobrar.')}</h2>
      <p className="na-lead">{t('O app só funciona se ele te chamar na hora certa. É assim que vai chegar para você:')}</p>

      <div className="na-preview" aria-hidden="true">
        <span className="na-app">
          <Icon name="flame" size={18} />
        </span>
        <span className="na-txt">
          <b>{preview.title}</b>
          <small>{preview.body}</small>
        </span>
        <span className="na-time">{t('agora')}</span>
      </div>

      <ul className="na-list">
        <li>
          <Icon name="food" size={16} /> {t('Cada refeição no horário, com o que comer')}
        </li>
        <li>
          <Icon name="dumbbell" size={16} /> {t('O treino 1h antes, com os exercícios')}
        </li>
        <li>
          <Icon name="flame" size={16} /> {t('O último aviso antes do dia zerar a sua sequência')}
        </li>
      </ul>

      <ol className="timeline na-steps">
        <li className={`tl-step ${installed ? 'done' : 'now'}`}>
          <span className="tl-dot">{installed ? <Icon name="check" size={14} stroke={3} /> : 1}</span>
          <div className="tl-body">
            <b>{t('Coloque o app na tela de início do celular')}</b>
            <InstallStep />
          </div>
        </li>
        <li className={`tl-step ${granted ? 'done' : installed ? 'now' : 'todo'}`}>
          <span className="tl-dot">{granted ? <Icon name="check" size={14} stroke={3} /> : 2}</span>
          <div className="tl-body">
            <b>{t('Ative os avisos')}</b>
            <NotifyStep onGranted={done} />
          </div>
        </li>
      </ol>
      <small className="na-foot">
        <Icon name="lock" size={13} /> {t('No máximo 9 por dia, só nos horários da sua rotina. Dá para desligar nos ajustes do celular quando quiser.')}
      </small>
    </section>
  )
}
