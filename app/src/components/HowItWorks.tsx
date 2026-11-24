// Aulas do app: depois do cadastro, ensina a usar TUDO, uma tela por vez, com uma prévia de cada parte.
// No fim, leva para "Monte seu projetinho". Pode ser revisto no Perfil.
import { type ReactNode, useState } from 'react'
import { t } from '../i18n'
import type { Moment } from '../store'
import { Icon } from './Icon'

interface Lesson {
  icon: string
  tone: string
  title: string
  points: string[]
  mock: ReactNode
}

const Row = ({ ic, txt, on, time }: { ic: string; txt: string; on?: boolean; time?: string }) => (
  <span className={`lm-row ${on ? 'on' : ''}`}>
    {time && <small>{time}</small>}
    <Icon name={ic} size={14} />
    <b>{txt}</b>
    <i>{on && <Icon name="check" size={11} stroke={3} />}</i>
  </span>
)

function lessons(): Lesson[] {
  return [
    {
      icon: 'sun',
      tone: 'blue',
      title: 'A tela Hoje é o seu painel',
      points: ['No topo: a água do dia e você hoje x a foto de referência.', 'Logo abaixo: seus treinos, cardio, dieta e peso da semana.', 'Missões do dia valem pontos para subir de nível.'],
      mock: (
        <span className="lm">
          <span className="lm-water">
            <small>{t('Água hoje')}</small>
            <b>1,5 L</b>
            <i style={{ width: '50%' }} />
          </span>
          <span className="lm-grid">
            <span>
              <small>{t('Treinos')}</small>
              <b>2/4</b>
            </span>
            <span>
              <small>{t('Dieta')}</small>
              <b>8.0</b>
            </span>
          </span>
        </span>
      ),
    },
    {
      icon: 'check',
      tone: 'mint',
      title: 'Seu dia: marque o que cumpriu',
      points: ['Em "Seu dia" ficam as tarefas de hoje, por horário.', 'Fez? Toque no círculo. É assim que o app sabe o que você cumpriu.', 'Sem marcar, para o app não aconteceu.'],
      mock: (
        <span className="lm">
          <Row ic="sun" txt={t('Acordar e beber água')} time="06:30" on />
          <Row ic="food" txt={t('Almoço')} time="12:30" on />
          <Row ic="dumbbell" txt={t('Treino')} time="18:30" />
          <Row ic="list" txt={t('Prestar contas do dia')} time="21:30" />
        </span>
      ),
    },
    {
      icon: 'trophy',
      tone: 'butter',
      title: 'Treinou? Toque em "Treinei hoje"',
      points: ['Na aba Treino e dieta ou no Seu dia.', 'Abre a tela de vitória e o treino já conta na semana, no projetinho e no ranking.', 'Depois do treino, eu ainda te mando um parabéns.'],
      mock: (
        <span className="lm lm-vic">
          <span className="lm-trophy">
            <Icon name="trophy" size={30} />
          </span>
          <b>{t('Treino feito')}</b>
          <span className="lm-week">
            {[1, 1, 0, 1, 0, 0, 0].map((v, i) => (
              <i key={i} className={v ? 'on' : ''} />
            ))}
          </span>
        </span>
      ),
    },
    {
      icon: 'dumbbell',
      tone: 'blue',
      title: 'Treino e dieta, dia por dia',
      points: ['Na aba Treino e dieta você vê o treino e as refeições de cada dia da semana.', 'Enviou PDF ou foto da ficha? Abre ali mesmo, na academia.', 'Tem cronômetro de descanso entre as séries.'],
      mock: (
        <span className="lm">
          <span className="lm-days">
            {['S', 'T', 'Q', 'Q', 'S'].map((d, i) => (
              <i key={i} className={i === 1 ? 'on' : ''}>
                {d}
              </i>
            ))}
          </span>
          <Row ic="dumbbell" txt="Supino reto · 4x10" on />
          <Row ic="dumbbell" txt="Remada curvada · 4x10" />
        </span>
      ),
    },
    {
      icon: 'droplet',
      tone: 'mint',
      title: 'Água: um toque por copo',
      points: ['Bebeu? Toque no copo, na garrafinha ou na garrafa.', 'A meta é calculada pelo seu peso.', 'Se você cumprir treino, dieta e cardio, eu fico em cima até você bater a água.'],
      mock: (
        <span className="lm lm-agua">
          {[
            ['cup', '200 ml'],
            ['bottleS', '500 ml'],
            ['bottle', '1 L'],
          ].map(([ic, l]) => (
            <span key={l}>
              <Icon name={ic} size={22} />
              <small>{l}</small>
            </span>
          ))}
        </span>
      ),
    },
    {
      icon: 'bell',
      tone: 'peach',
      title: 'Eu te cobro o dia inteiro',
      points: ['De manhã eu pergunto que horas você vai treinar.', 'Depois acompanho até você ir. Se não for, eu cobro.', 'Travou? Toque em "Falar com o treinador" e a gente conversa.'],
      mock: (
        <span className="lm">
          <span className="lm-notif">
            <b>{t('Que horas você vai treinar hoje?')}</b>
            <small>{t('Toque e me diga um horário.')}</small>
          </span>
          <span className="lm-notif">
            <b>{t('Treino às 19:00: hora de se arrumar')}</b>
            <small>{t('Roupa, garrafinha e porta.')}</small>
          </span>
        </span>
      ),
    },
    {
      icon: 'list',
      tone: 'butter',
      title: 'Toda noite, preste contas',
      points: ['Seis perguntas rápidas, com sinceridade. Leva 1 minuto.', 'É isso que mantém sua sequência de dias viva.', 'Pulou um dia? A sequência volta para zero.'],
      mock: (
        <span className="lm lm-streak">
          <Icon name="flame" size={30} />
          <b>12</b>
          <small>{t('dias sem falhar')}</small>
        </span>
      ),
    },
    {
      icon: 'star',
      tone: 'lilac',
      title: 'O projetinho: seu plano com prazo',
      points: ['Você define o resultado, a data e o porquê.', 'Faz promessas para o dia seguinte e cumpre.', 'O app mostra a previsão: nesse ritmo, quando você chega lá.'],
      mock: (
        <span className="lm">
          <span className="lm-pv">
            <small>{t('Previsão')}</small>
            <b>{t('Nesse ritmo, você chega em 78 kg em 12 de mar.')}</b>
            <i>{t('3 semanas antes do prazo')}</i>
          </span>
        </span>
      ),
    },
    {
      icon: 'camera',
      tone: 'peach',
      title: 'Foto semanal e ranking',
      points: ['Uma foto por semana, mesma pose e mesma luz, mostra a evolução.', 'No Ranking, você compete com amigos, grupos e todo mundo.'],
      mock: (
        <span className="lm">
          <Row ic="trophy" txt={t('1º  Você · 640 pts')} on />
          <Row ic="user" txt={t('2º  Amigo · 520 pts')} />
          <Row ic="user" txt={t('3º  Amiga · 410 pts')} />
        </span>
      ),
    },
  ]
}

const INTRO: Record<Moment, string> = {
  nunca: 'Você está começando do zero. Sem pressa: aprenda o básico e vá um passo de cada vez.',
  parei: 'Você já sabe treinar. Aqui o foco é não parar de novo.',
  desanimado: 'Não precisa de motivação agora. Só aprenda como funciona: o resto eu faço com você.',
  treino: 'Você já treina. Então aqui é à risca: aprenda tudo e use cada parte.',
}

/** firstRun: no fim, mostra "Monte seu projetinho". Revendo pelo Perfil, só fecha. */
export function HowItWorks({ onDone, firstRun = false, moment }: { onDone: () => void; firstRun?: boolean; moment?: Moment }) {
  const all = lessons()
  const [i, setI] = useState(0)
  const done = i >= all.length
  const sl = all[Math.min(i, all.length - 1)]
  return (
    <div className="how" role="dialog" aria-modal="true" aria-label={t('Aulas do app')}>
      <div className="how-top">
        <span className="how-count">{done ? t('Concluído') : t('Aula {a} de {b}', { a: i + 1, b: all.length })}</span>
        {!done && !firstRun && (
          <button type="button" className="link" onClick={onDone}>
            {t('Pular')}
          </button>
        )}
      </div>
      <div className="how-prog">
        <span style={{ width: `${(Math.min(i, all.length) / all.length) * 100}%` }} />
      </div>

      {done ? (
        <div className="how-txt how-end" key="end">
          <span className="how-ic lilac">
            <Icon name="star" size={54} stroke={1.8} />
          </span>
          <h1>{t('Aulas concluídas')}</h1>
          <p>{firstRun ? t('Agora você sabe usar tudo. Próximo passo: montar o seu projetinho.') : t('Você revisou tudo. Bora usar.')}</p>
        </div>
      ) : (
        <>
          <div className="how-art" key={i}>
            {sl.mock}
          </div>
          <div className="how-txt" key={`t${i}`}>
            {i === 0 && moment && <p className="how-intro">{t(INTRO[moment])}</p>}
            <h1>{t(sl.title)}</h1>
            <ul className="how-pts">
              {sl.points.map((x) => (
                <li key={x}>
                  <Icon name="check" size={14} stroke={3} /> {t(x)}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="how-foot">
        {i > 0 && !done && (
          <button type="button" className="ghost-btn how-back" onClick={() => setI(i - 1)}>
            <Icon name="back" size={18} />
          </button>
        )}
        <button type="button" className="cta" onClick={() => (done ? onDone() : setI(i + 1))}>
          {done ? (firstRun ? t('Montar meu projetinho') : t('Fechar')) : i === all.length - 1 ? t('Concluir aulas') : t('Entendi, próxima')}
        </button>
      </div>
    </div>
  )
}
