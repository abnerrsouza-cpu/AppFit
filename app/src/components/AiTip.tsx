// Dica para criar a foto de referência com IA: a pessoa se vê como quer ficar.
import { useState } from 'react'
import { t } from '../i18n'
import type { Profile } from '../store'
import { Icon } from './Icon'

export function aiPrompt(p: Profile) {
  const goal = p.weightStart > p.weightGoal ? t('{n} kg mais magro', { n: Math.round(p.weightStart - p.weightGoal) }) : t('mais forte')
  return t('Use esta foto minha e me mostre {g}, com o abdômen definido e mais músculo, mesma pose, mesma luz e mesmo lugar. Realista, sem filtro.', { g: goal })
}

export function AiTip({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const prompt = aiPrompt(profile)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* sem permissão */
    }
  }
  return (
    <div className={`fp-tip ai-tip ${compact ? 'compact' : ''}`}>
      <b className="ai-tip-h">
        <Icon name="star" size={16} /> {t('Crie com IA a sua versão de como quer ficar')}
      </b>
      <small>{t('Ver você mesmo no shape que quer ter motiva muito mais do que a foto de outra pessoa.')}</small>
      <ol className="ai-steps">
        <li>{t('Copie o pedido abaixo.')}</li>
        <li>{t('Abra o ChatGPT ou o Gemini, envie uma foto sua de corpo inteiro e cole o pedido.')}</li>
        <li>{t('Salve a imagem que a IA criar e escolha ela aqui.')}</li>
      </ol>
      <p>"{prompt}"</p>
      <div className="ai-btns">
        <button type="button" className="ai-copy" onClick={copy}>
          <Icon name={copied ? 'check' : 'list'} size={16} /> {copied ? t('Pedido copiado') : t('Copiar pedido')}
        </button>
        <a className="ai-open" href="https://chatgpt.com/" target="_blank" rel="noreferrer">
          {t('Abrir ChatGPT')} <Icon name="arrow" size={14} />
        </a>
      </div>
    </div>
  )
}
