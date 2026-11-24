// Último passo do primeiro acesso: marcar o primeiro treino. O jeito de falar segue o momento da pessoa.
import { useState } from 'react'
import { t } from '../i18n'
import { type AppState, addDays, coachStyle, setState, today, ymd } from '../store'
import { Icon } from './Icon'

export function FirstWorkout({ s, onDone }: { s: AppState; onDone: () => void }) {
  const p = s.profile
  const style = coachStyle(p, 0)
  const first = (p.name || '').split(' ')[0]
  const [picked, setPicked] = useState<{ h: string; tomorrow: boolean } | null>(null)
  const now = new Date()
  const soon = new Date(now.getTime() + 60 * 60000)
  const sm = soon.getMinutes()
  const soonH = `${String(sm <= 30 ? soon.getHours() : (soon.getHours() + 1) % 24).padStart(2, '0')}:${sm <= 30 ? '30' : '00'}`
  const opts = [...new Set([soonH, p.trainTime, '18:00', '19:00', '20:00'])].filter((h) => h > `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`).sort().slice(0, 4)
  const late = now.getHours() >= 21 || !opts.length

  const pick = (h: string, tomorrow = false) => {
    const day = tomorrow ? ymd(addDays(new Date(), 1)) : today()
    setState((x) => ({ ...x, trainAt: { ...(x.trainAt || {}), [day]: h } }))
    setPicked({ h, tomorrow })
  }
  const finish = () => {
    setState((x) => ({ ...x, firstRun: undefined, coachAt: Date.now() }))
    onDone()
  }

  return (
    <div className="fw" role="dialog" aria-modal="true" aria-label={t('Primeiro treino')}>
      <div className="fw-in">
        <span className="fw-ic">
          <Icon name="dumbbell" size={40} />
        </span>
        <span className="victory-kicker">{t('Último passo')}</span>
        {!picked ? (
          <>
            <h1>{style === 'serio' ? t('Projeto montado, {n}. Agora é executar.', { n: first }) : t('Agora, o seu primeiro treino.')}</h1>
            <p className="fw-sub">
              {style === 'leve'
                ? t('Ele não precisa ser perfeito. Precisa existir. Pensa só nos próximos 5 minutos: roupa, garrafinha e porta.')
                : style === 'serio'
                  ? t('Sem esperar segunda-feira. Que horas é o treino?')
                  : t('Quem marca horário vai. Escolha quando vai ser.')}
            </p>
            {!late && (
              <>
                <span className="fw-q">{t('Hoje às')}</span>
                <div className="fw-opts">
                  {opts.map((h) => (
                    <button key={h} type="button" className="fw-opt" onClick={() => pick(h)}>
                      {h}
                    </button>
                  ))}
                </div>
              </>
            )}
            <span className="fw-q">{late ? t('Já está tarde. Amanhã às') : t('Hoje não dá? Amanhã às')}</span>
            <div className="fw-opts">
              {['06:00', '07:00', '12:00', p.trainTime].filter((h, i, a) => a.indexOf(h) === i).map((h) => (
                <button key={h} type="button" className="fw-opt ghost" onClick={() => pick(h, true)}>
                  {h}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1>{picked.tomorrow ? t('Fechado: amanhã às {h}.', { h: picked.h }) : t('Fechado: hoje às {h}.', { h: picked.h })}</h1>
            <p className="fw-sub">
              {style === 'leve'
                ? t('Eu te lembro antes, te acompanho até você ir e comemoro com você depois. Um passo de cada vez.')
                : t('Eu te lembro 1 hora antes, cobro na hora de sair e confiro se você foi. Combinado é combinado.')}
            </p>
            <p className="fw-sub fw-tip">
              <Icon name="check" size={16} stroke={3} /> {t('Quando terminar, toque em "Treinei hoje" na aba Treino e dieta.')}
            </p>
          </>
        )}
        <button type="button" className="victory-btn" disabled={!picked} onClick={finish}>
          {picked ? t('Ir para o app') : t('Escolha um horário')}
        </button>
      </div>
    </div>
  )
}
