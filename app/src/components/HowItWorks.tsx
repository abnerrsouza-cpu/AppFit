import { useState } from 'react'
import { t } from '../i18n'
import { Icon } from './Icon'

const SLIDES = [
  { icon: 'bell', tone: 'blue', title: 'O app te cobra o dia inteiro', text: 'Nos horários da sua rotina, você recebe cobranças no celular: refeições, treino e a prestação de contas da noite.' },
  { icon: 'check', tone: 'mint', title: 'Marque o que você cumpriu', text: 'Na tela Hoje, a tarefa do momento aparece no topo. Fez? Toque em Feito e ganhe pontos.' },
  { icon: 'list', tone: 'butter', title: 'Toda noite, preste contas', text: 'Seis perguntas rápidas, com sinceridade. É isso que mantém sua sequência viva.' },
  { icon: 'camera', tone: 'peach', title: 'Uma foto por semana', text: 'Mesma luz, mesma pose. Em poucas semanas, o antes e depois mostra o que as palavras não mostram.' },
  { icon: 'star', tone: 'lilac', title: 'Suba de nível', text: 'Cada dia cumprido vale pontos e medalhas. Pular um dia zera sua sequência. Sem desculpa.' },
]

/** "Como funciona": aparece uma vez depois do cadastro e pode ser revisto no Perfil. */
export function HowItWorks({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const sl = SLIDES[i]
  const last = i === SLIDES.length - 1
  return (
    <div className="how" role="dialog" aria-modal="true" aria-label={t('Como funciona')}>
      <div className="how-top">
        <span className="how-count">
          {i + 1}/{SLIDES.length}
        </span>
        {!last && (
          <button type="button" className="link" onClick={onDone}>
            {t('Pular')}
          </button>
        )}
      </div>
      <div className="how-art" key={i}>
        <span className={`how-blob ${sl.tone}`} />
        <span className={`how-ic ${sl.tone}`}>
          <Icon name={sl.icon} size={54} stroke={1.8} />
        </span>
      </div>
      <div className="how-txt" key={`t${i}`}>
        <h1>{t(sl.title)}</h1>
        <p>{t(sl.text)}</p>
      </div>
      <div className="how-dots">
        {SLIDES.map((_, k) => (
          <i key={k} className={k === i ? 'on' : ''} />
        ))}
      </div>
      <button type="button" className="cta" onClick={() => (last ? onDone() : setI(i + 1))}>
        {last ? t('Começar agora') : t('Continuar')}
      </button>
    </div>
  )
}
