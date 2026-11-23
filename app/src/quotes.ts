// Frase do dia da abertura: ácida, cutuca e motiva. Muda uma vez por dia (ciclo de 40).
// Regra: cutucar a atitude, nunca o corpo da pessoa.
import { t } from './i18n'

export const QUOTES = [
  'Ninguém vai te salvar. Levanta e faz.',
  'Você não está cansado. Você está acostumado a desistir.',
  'Seu sofá não vai te dar o corpo que você quer.',
  'Motivação é para amador. Disciplina é para quem quer resultado.',
  'Se fosse fácil, todo mundo teria. Por isso quase ninguém tem.',
  'Você pagou para ser cobrado. Então aguenta.',
  'Amanhã é a mentira favorita de quem nunca começa.',
  'O espelho não aceita desculpa.',
  'Ninguém se arrepende do treino que fez. Só do que pulou.',
  'Seu eu do futuro está te olhando agora. Ele está orgulhoso ou decepcionado?',
  'Você quer resultado de atleta com rotina de turista.',
  'A dor passa. Desistir fica no seu histórico.',
  'Pare de negociar consigo mesmo. Você sempre perde.',
  'Vontade é opcional. Compromisso não.',
  'Você não precisa de mais um plano. Precisa cumprir o que já tem.',
  'Cada "só hoje" virou um ano inteiro.',
  'O corpo que você quer está do outro lado do que você está evitando.',
  'Quem quer arruma um jeito. Quem não quer arruma uma desculpa.',
  'Seja hoje a pessoa que você prometeu ser na segunda-feira.',
  'Disciplina é lembrar o que você quer de verdade.',
  'Você não falhou por falta de informação. Falhou por falta de constância.',
  'Ninguém aplaude o treino das 6h. É por isso que ele funciona.',
  'Se você não mudar nada, nada vai mudar.',
  'Conforto é onde os sonhos vão morrer.',
  'Você tem tempo para rolar o feed. Tem tempo para treinar.',
  'Resultado não vem do dia perfeito. Vem do dia comum que você não pulou.',
  'Hoje vale R$ 0,55. Não jogue fora.',
  'Você já desistiu tantas vezes. Que tal não desistir dessa vez?',
  'O cansaço de hoje é o orgulho de amanhã.',
  'Ninguém liga para o seu esforço. Só você. E isso basta.',
  'Pare de esperar a vontade chegar. Ela chega depois que você começa.',
  'Você não está longe da meta. Está longe da rotina.',
  'A fome passa. O arrependimento demora.',
  'A versão de você que você admira treinaria hoje.',
  'Desculpa não queima caloria.',
  'Você não começou para parar no meio.',
  'Ser mediano é confortável. É por isso que tanta gente fica lá.',
  'Constância vence talento que não aparece.',
  'Seu limite fica bem mais longe do que a sua preguiça diz.',
  'Faça hoje o que o seu eu de daqui a 90 dias vai agradecer.',
]

/** Frase do dia (a mesma para todos no mesmo dia, no idioma atual). */
export function quoteOfDay(d = new Date()) {
  const day = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000)
  return t(QUOTES[day % QUOTES.length])
}
