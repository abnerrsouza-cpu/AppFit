// Conteúdo da aba Notícias.
// MVP: artigos escritos aqui. Produção: vir de um CMS/planilha ou de feeds RSS pelo servidor,
// para publicar sem atualizar o app.

export type Cat = 'treino' | 'nutricao' | 'mente' | 'cardio' | 'novidade'

export const CATS: { id: Cat | 'tudo' | 'videos'; label: string; emoji: string }[] = [
  { id: 'tudo', label: 'Tudo', emoji: '✨' },
  { id: 'treino', label: 'Treino', emoji: '🏋️' },
  { id: 'nutricao', label: 'Nutrição', emoji: '🥗' },
  { id: 'mente', label: 'Mente', emoji: '🧠' },
  { id: 'cardio', label: 'Cardio', emoji: '🏃' },
  { id: 'videos', label: 'Vídeos', emoji: '▶️' },
  { id: 'novidade', label: 'Novidades', emoji: '📣' },
]

export const CAT_STYLE: Record<Cat, { name: string; grad: string }> = {
  treino: { name: 'Treino', grad: 'linear-gradient(140deg,#1f6feb,#0a3d9e)' },
  nutricao: { name: 'Nutrição', grad: 'linear-gradient(140deg,#10b981,#047857)' },
  mente: { name: 'Mente', grad: 'linear-gradient(140deg,#6366f1,#3730a3)' },
  cardio: { name: 'Cardio', grad: 'linear-gradient(140deg,#0ea5e9,#0369a1)' },
  novidade: { name: 'Novidade', grad: 'linear-gradient(140deg,#f59e0b,#c2410c)' },
}

export interface Article {
  id: string
  cat: Cat
  emoji: string
  title: string
  summary: string
  minutes: number
  date: string // dd/mm
  body: { h?: string; p: string }[]
  takeaway: string[]
}

export const ARTICLES: Article[] = [
  {
    id: 'nunca-falhe-duas-vezes',
    cat: 'mente',
    emoji: '🔁',
    title: 'A regra que salva qualquer dieta: nunca falhe duas vezes',
    summary: 'Um dia ruim não estraga nada. Dois seguidos viram hábito. Veja como cortar o efeito dominó.',
    minutes: 3,
    date: '22/11',
    body: [
      { p: 'Todo mundo fura. A diferença entre quem chega no resultado e quem desiste não é nunca errar, é o que acontece no dia seguinte ao erro.' },
      { h: 'O efeito "já que"', p: '"Já que comi pizza no almoço, vou chutar o balde até domingo." Esse pensamento transforma uma refeição fora do plano em uma semana perdida. Uma refeição ruim não muda seu corpo. Uma semana muda.' },
      { h: 'A regra', p: 'Errou hoje? Tudo bem. Amanhã a primeira refeição é exatamente a do plano, e o treino acontece, nem que seja a versão curta. O objetivo é que o erro nunca vire sequência.' },
      { h: 'Na prática', p: 'Na prestação de contas da noite, seja honesto sobre o que furou. Depois escreva qual é a primeira coisa certa que você vai fazer amanhã. Decidir antes tira a negociação da manhã.' },
    ],
    takeaway: ['Errou? Conte a verdade no check-in.', 'Defina a primeira ação certa de amanhã.', 'Nunca deixe o erro virar dois dias.'],
  },
  {
    id: 'proteina-quanto',
    cat: 'nutricao',
    emoji: '🍗',
    title: 'Quanta proteína você precisa por dia, sem exagero',
    summary: 'O número que a ciência sustenta para quem treina, e um jeito simples de bater sem contar grama por grama.',
    minutes: 4,
    date: '21/11',
    body: [
      { p: 'Para quem treina força e quer perder gordura ou ganhar músculo, a maior parte dos estudos aponta algo entre 1,6 e 2,2 g de proteína por quilo de peso corporal por dia.' },
      { h: 'Exemplo', p: 'Uma pessoa de 80 kg fica entre 130 e 175 g por dia. Dividido em 4 refeições, são cerca de 30 a 45 g por refeição.' },
      { h: 'Atalho visual', p: 'Uma palma da mão de carne, frango ou peixe tem por volta de 25 a 30 g de proteína. Três ovos, uns 18 g. Um pote de iogurte natural com uma dose de whey, uns 30 g.' },
      { h: 'Por que importa no corte', p: 'Proteína segura mais a fome e ajuda a manter massa muscular quando você come menos calorias. É o primeiro item a acertar no prato.' },
    ],
    takeaway: ['Meta: 1,6 a 2,2 g por kg.', 'Uma palma de proteína em cada refeição.', 'Comece o prato pela proteína.'],
  },
  {
    id: 'sobrecarga-progressiva',
    cat: 'treino',
    emoji: '📈',
    title: 'Sobrecarga progressiva: o motivo de você estar estagnado',
    summary: 'Se o treino de hoje é igual ao de 3 meses atrás, o corpo também vai ser. Como evoluir semana a semana.',
    minutes: 4,
    date: '20/11',
    body: [
      { p: 'O músculo cresce quando recebe um estímulo um pouco maior do que está acostumado. Repetir sempre a mesma carga e as mesmas repetições mantém, mas não evolui.' },
      { h: 'Como progredir', p: 'Escolha uma faixa de repetições, por exemplo 8 a 12. Quando conseguir fazer 12 em todas as séries com boa técnica, aumente um pouco a carga e volte para 8.' },
      { h: 'Outras formas', p: 'Mais uma repetição, mais uma série, menos descanso ou uma execução mais controlada também contam como progresso.' },
      { h: 'Anote', p: 'Sem anotar, você não sabe se evoluiu. Use a ficha de treino do app e escreva a carga ao lado de cada exercício.' },
    ],
    takeaway: ['Use uma faixa de repetições.', 'Bateu o topo? Aumente a carga.', 'Anote cargas toda semana.'],
  },
  {
    id: 'sono-e-fome',
    cat: 'mente',
    emoji: '😴',
    title: 'Dormir mal te deixa com mais fome. Não é frescura',
    summary: 'Noites curtas mexem nos hormônios do apetite e na força de vontade. O sono é parte da dieta.',
    minutes: 3,
    date: '19/11',
    body: [
      { p: 'Pesquisas mostram que dormir pouco tende a aumentar a fome e a vontade de comer alimentos mais calóricos no dia seguinte. A decisão de furar a dieta muitas vezes começa na noite anterior.' },
      { h: 'Quanto dormir', p: 'Para a maioria dos adultos, entre 7 e 9 horas por noite.' },
      { h: 'O que ajuda', p: 'Horário fixo para deitar e acordar, quarto escuro e fresco, e celular longe da cama nos últimos 30 minutos. Cafeína só até o começo da tarde.' },
    ],
    takeaway: ['Mire em 7 a 9 horas.', 'Mesmo horário todo dia.', 'Celular fora da cama.'],
  },
  {
    id: 'cardio-zona-2',
    cat: 'cardio',
    emoji: '🫀',
    title: 'Cardio leve que funciona: o que é a tal "zona 2"',
    summary: 'Intensidade em que você ainda consegue conversar. Fácil de manter, ótimo para o coração e para a constância.',
    minutes: 3,
    date: '18/11',
    body: [
      { p: 'Zona 2 é um ritmo moderado: você respira mais forte, mas ainda consegue falar frases inteiras. Uma caminhada rápida na esteira inclinada costuma servir.' },
      { h: 'Por que usar', p: 'É sustentável, cansa pouco e atrapalha pouco o treino de força. Ajuda no condicionamento e soma gasto calórico ao longo da semana.' },
      { h: 'Quanto', p: 'As recomendações gerais de saúde falam em pelo menos 150 minutos de atividade moderada por semana. Dá 30 minutos em 5 dias.' },
    ],
    takeaway: ['Ritmo em que dá para conversar.', 'Meta de 150 min por semana.', 'Esteira inclinada é uma boa opção.'],
  },
  {
    id: 'agua',
    cat: 'nutricao',
    emoji: '💧',
    title: 'Água: o hábito mais fácil que você ainda esquece',
    summary: 'Sede às vezes se disfarça de fome. Um jeito simples de bater a meta sem pensar.',
    minutes: 2,
    date: '17/11',
    body: [
      { p: 'Uma referência comum é algo em torno de 35 ml por quilo por dia, ajustando para mais em dias quentes e de treino.' },
      { h: 'Truque', p: 'Deixe uma garrafa sempre à vista e beba um copo cheio ao acordar e antes de cada refeição. Só isso já resolve boa parte da meta.' },
    ],
    takeaway: ['Garrafa sempre à vista.', 'Um copo antes de cada refeição.'],
  },
  {
    id: 'passos-neat',
    cat: 'cardio',
    emoji: '👟',
    title: 'Os passos do dia queimam mais que você imagina',
    summary: 'O movimento fora da academia pesa muito no gasto total. E costuma cair justamente quando você faz dieta.',
    minutes: 3,
    date: '16/11',
    body: [
      { p: 'Tudo que você gasta se mexendo fora do treino, como andar, subir escada e ficar em pé, pode variar centenas de calorias por dia entre uma pessoa e outra.' },
      { h: 'O problema', p: 'Em dieta, o corpo tende a se mexer menos sem você perceber. Isso freia a perda de peso.' },
      { h: 'Solução', p: 'Tenha uma meta de passos diária e mantenha ela durante todo o ciclo. Ligações andando, escada no lugar do elevador e uma volta depois do almoço.' },
    ],
    takeaway: ['Defina uma meta de passos.', 'Mantenha durante a dieta.'],
  },
  {
    id: 'novidade-anel',
    cat: 'novidade',
    emoji: '🎯',
    title: 'Novo no app: anéis do dia e check-in em stories',
    summary: 'Agora seu dia aparece em três anéis e a prestação de contas leva menos de um minuto.',
    minutes: 1,
    date: '22/11',
    body: [
      { p: 'Os anéis de treino, dieta e cardio enchem conforme você marca as tarefas em "Seu dia". Feche os três antes de dormir.' },
      { p: 'A prestação de contas virou uma sequência de perguntas rápidas, com toques e carinhas. Menos digitação, mais verdade.' },
    ],
    takeaway: ['Feche os três anéis todo dia.'],
  },
]
