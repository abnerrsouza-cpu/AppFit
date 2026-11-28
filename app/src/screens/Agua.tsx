// Aba de água: toca no recipiente, a garrafa enche, e o histórico mostra quanto bebeu.
import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Info } from '../components/Info'
import { t } from '../i18n'
import { type AppState, addDays, today, ymd } from '../store'
import { CONTAINERS, drink, fmtL, undrink, waterGoal, waterLog, waterTotal } from '../water'

const ICON: Record<string, string> = { copo: 'cup', caneca: 'mug', garrafinha: 'bottleS', garrafa: 'bottle', outro: 'droplet' }
const NAME: Record<string, string> = { copo: 'Copo', caneca: 'Caneca', garrafinha: 'Garrafinha', garrafa: 'Garrafa', outro: 'Outro' }

export function Agua({ s, onBack }: { s: AppState; onBack: () => void }) {
  const goal = waterGoal(s)
  const total = waterTotal(s)
  const log = waterLog(s)
  const pct = Math.min(1, total / goal)
  const [custom, setCustom] = useState('')
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i - 6)
    const k = ymd(d)
    return { k, label: d.toLocaleDateString(undefined, { weekday: 'short' }).replace('.', ''), ml: waterTotal(s, k), today: k === today() }
  })
  const max = Math.max(goal, ...week.map((w) => w.ml))
  const hits = week.filter((w) => w.ml >= goal).length

  return (
    <div className="screen agua">
      <div className="sheet-h">
        <button type="button" className="round-btn" onClick={onBack} aria-label={t('Voltar')}>
          <Icon name="back" />
        </button>
        <span className="eyebrow">{t('Água')}</span>
      </div>
      <h1 className="ttl">
        {t('Controle de água')}
        <Info text={s.profile.waterGoalMl ? t('Toque no recipiente toda vez que beber. A meta é a que você definiu no plano alimentar.') : t('Toque no recipiente toda vez que beber. A meta é calculada pelo seu peso: 35 ml por quilo.')} />
      </h1>

      <section className="card ag-hero">
        <div className={`ag-bottle ${pct >= 1 ? 'full' : ''}`} aria-hidden="true">
          <span className="ag-cap" />
          <span className="ag-body">
            <span className="ag-fill" style={{ height: `${pct * 100}%` }}>
              <i className="ag-wave" />
            </span>
            <b>{Math.round(pct * 100)}%</b>
          </span>
        </div>
        <div className="ag-info">
          <small>{t('Hoje')}</small>
          <b className="ag-l">
            {fmtL(total)} <span>L</span>
          </b>
          <span className="ag-goal">{t('de {g} L', { g: fmtL(goal) })}</span>
          <p>{pct >= 1 ? t('Meta batida. Continue se hidratando.') : t('Faltam {n} L', { n: fmtL(goal - total) })}</p>
        </div>
      </section>

      <p className="ttl hint">{t('O que você bebeu agora?')}</p>
      <div className="ag-grid">
        {CONTAINERS.map((c) => (
          <button key={c.kind} type="button" className="card ag-c" onClick={() => drink(s, c.ml, c.kind)}>
            <Icon name={ICON[c.kind]} size={34} stroke={1.8} />
            <b>{t(c.label)}</b>
            <small>{c.ml < 1000 ? `${c.ml} ml` : '1 L'}</small>
          </button>
        ))}
      </div>
      <form
        className="card ag-custom"
        onSubmit={(e) => {
          e.preventDefault()
          const n = Math.round(Number(custom))
          if (n > 0 && n <= 3000) {
            drink(s, n, 'outro')
            setCustom('')
          }
        }}
      >
        <Icon name="droplet" size={20} />
        <input inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} placeholder={t('Outro valor em ml')} aria-label={t('Outro valor em ml')} />
        <button type="submit" className="cta sm-cta" disabled={!custom}>
          {t('Adicionar')}
        </button>
      </form>

      <section className="card block">
        <h2 className="ttl">{t('Hoje você bebeu')}</h2>
        {log.length === 0 ? (
          <p className="muted">{t('Nada ainda. Comece com um copo agora.')}</p>
        ) : (
          <ul className="ag-log">
            {log
              .map((e, i) => ({ e, i }))
              .reverse()
              .map(({ e, i }) => (
                <li key={i}>
                  <span className="ag-ic">
                    <Icon name={ICON[e.kind] || 'droplet'} size={18} />
                  </span>
                  <span>
                    <b>{t(NAME[e.kind] || 'Outro')}</b>
                    <small>{e.at}</small>
                  </span>
                  <b className="ag-ml">{e.ml} ml</b>
                  <button type="button" className="ag-del" onClick={() => undrink(s, i)} aria-label={t('Remover')}>
                    <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="card block">
        <div className="block-h">
          <h2 className="ttl">{t('Últimos 7 dias')}</h2>
          <small className="muted">{t('{n} de 7 dias na meta', { n: hits })}</small>
        </div>
        <div className="ag-week">
          <span className="ag-goal-line" style={{ bottom: `calc(22px + ${goal / max} * (100% - 40px))` }} />
          {week.map((w) => (
            <div key={w.k} className={`ag-day ${w.today ? 'is-today' : ''}`}>
              <span className="ag-v">{w.ml ? fmtL(w.ml) : ''}</span>
              <span className="ag-bar">
                <span className={w.ml >= goal ? 'hit' : ''} style={{ height: `${(w.ml / max) * 100}%` }} />
              </span>
              <small>{w.label}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
