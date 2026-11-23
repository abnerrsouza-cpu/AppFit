import { Icon } from '../components/Icon'
import { Info } from '../components/Info'
import { XP, levelOf, medals, totalXP } from '../game'
import { t } from '../i18n'
import type { AppState } from '../store'

export function Conquistas({ s, onBack }: { s: AppState; onBack: () => void }) {
  const lv = levelOf(totalXP(s))
  const list = medals(s)
  const got = list.filter((m) => m.unlocked).length
  const sorted = [...list].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.progress[0] / b.progress[1] - a.progress[0] / a.progress[1])
  return (
    <div className="screen">
      <div className="sheet-h">
        <button type="button" className="round-btn" onClick={onBack} aria-label={t('Voltar')}>
          <Icon name="back" />
        </button>
        <span className="eyebrow">{t('Conquistas')}</span>
      </div>

      <section className="level-card big">
        <span className="level-badge">
          <small>{t('Nível')}</small>
          <b>{lv.n}</b>
        </span>
        <div className="level-txt">
          <b className="ttl">
            {lv.name}
            <Info light text={t('Você ganha pontos marcando tarefas, prestando contas, enviando a foto semanal e cumprindo promessas e metas. Mais pontos, nível maior.')} />
          </b>
          <div className="level-bar">
            <span style={{ width: `${Math.round(lv.pct * 100)}%` }} />
          </div>
          <small>{lv.next ? t('{a} de {b} pontos para o próximo nível', { a: lv.xp, b: lv.next }) : t('{a} pontos · nível máximo', { a: lv.xp })}</small>
        </div>
      </section>

      <section className="card block">
        <h2 className="ttl">
          {t('Como ganhar pontos')}
          <Info text={t('Pontos acumulam para sempre. Eles medem o quanto você está cumprindo o que prometeu.')} />
        </h2>
        <ul className="xp-list">
          <li>
            <Icon name="check" size={16} /> {t('Marcar uma tarefa do dia')} <b>+{XP.task}</b>
          </li>
          <li>
            <Icon name="list" size={16} /> {t('Prestar contas à noite')} <b>+{XP.checkin}</b>
          </li>
          <li>
            <Icon name="dumbbell" size={16} /> {t('Fazer o treino completo')} <b>+{XP.trained}</b>
          </li>
          <li>
            <Icon name="camera" size={16} /> {t('Check-in semanal com foto')} <b>+{XP.weekly + XP.photo}</b>
          </li>
          <li>
            <Icon name="star" size={16} /> {t('Cumprir uma promessa')} <b>+{XP.promise}</b>
          </li>
          <li>
            <Icon name="target" size={16} /> {t('Bater uma meta')} <b>+{XP.goal}</b>
          </li>
        </ul>
      </section>

      <p className="ttl hint">
        {t('Medalhas: {a} de {b}', { a: got, b: list.length })}
        <Info text={t('Medalhas marcam marcos do seu projeto. As apagadas mostram quanto falta para conquistar.')} />
      </p>
      <div className="medal-grid">
        {sorted.map((m) => (
          <div key={m.id} className={`medal ${m.unlocked ? 'on' : ''} ${m.tier}`}>
            <span className="medal-ic">
              <Icon name={m.icon} size={24} />
              {!m.unlocked && (
                <i>
                  <Icon name="lock" size={10} stroke={2.6} />
                </i>
              )}
            </span>
            <b>{m.title}</b>
            <small>{m.unlocked ? t('Conquistada') : m.desc}</small>
            {!m.unlocked && m.progress[1] > 1 && (
              <span className="medal-prog">
                <span style={{ width: `${(m.progress[0] / m.progress[1]) * 100}%` }} />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
