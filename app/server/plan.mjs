// Lê o PDF da dieta ou da ficha de treino com o Claude e devolve o plano organizado.
// Precisa de ANTHROPIC_API_KEY nas variáveis do Railway.
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-5-5'
let client = null
const getClient = () => (client ??= new Anthropic())
export const planReady = () => !!process.env.ANTHROPIC_API_KEY

const LANG_NAME = { pt: 'português do Brasil', en: 'English', es: 'español' }

const DIET_SCHEMA = {
  type: 'object',
  properties: {
    readable: { type: 'boolean', description: 'false se o PDF não for um plano alimentar ou não der para ler' },
    meals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          time: { type: 'string', description: 'HH:MM, 24h' },
          items: { type: 'string', description: 'um alimento por linha, com quantidade' },
        },
        required: ['name', 'time', 'items'],
        additionalProperties: false,
      },
    },
    notes: { type: 'string', description: 'observações gerais curtas do plano (água, suplementos, trocas). Vazio se não houver.' },
  },
  required: ['readable', 'meals', 'notes'],
  additionalProperties: false,
}

const WORKOUT_SCHEMA = {
  type: 'object',
  properties: {
    readable: { type: 'boolean', description: 'false se o PDF não for uma ficha de treino ou não der para ler' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          weekday: { type: 'integer', description: '0=domingo, 1=segunda ... 6=sábado' },
          title: { type: 'string', description: 'nome curto do treino, ex.: Treino A · Peito e tríceps' },
          items: { type: 'string', description: 'um exercício por linha: nome — séries x repetições (descanso/carga se houver)' },
        },
        required: ['weekday', 'title', 'items'],
        additionalProperties: false,
      },
    },
    notes: { type: 'string', description: 'observações gerais curtas (aquecimento, cardio, progressão). Vazio se não houver.' },
  },
  required: ['readable', 'days', 'notes'],
  additionalProperties: false,
}

const ROUTINE_SCHEMA = {
  type: 'object',
  properties: {
    readable: { type: 'boolean', description: 'false se o PDF não tiver horários de rotina ou não der para ler' },
    wake: { type: 'string', description: 'horário de acordar HH:MM, ou vazio se não houver' },
    sleep: { type: 'string', description: 'horário de dormir HH:MM, ou vazio se não houver' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          time: { type: 'string', description: 'HH:MM, 24h' },
          title: { type: 'string', description: 'o afazer, curto e no imperativo. Ex.: Tomar creatina' },
        },
        required: ['time', 'title'],
        additionalProperties: false,
      },
    },
    notes: { type: 'string', description: 'observações gerais curtas. Vazio se não houver.' },
  },
  required: ['readable', 'wake', 'sleep', 'tasks', 'notes'],
  additionalProperties: false,
}

const PROMPTS = {
  routine: `Este PDF tem a rotina diária de uma pessoa (horários do dia: suplementos, água, estudo, trabalho, caminhada, alongamento, etc.).
Liste os afazeres com horário, na ordem do dia.
- Não inclua refeições nem o treino de musculação: o app já cuida deles em outras telas.
- wake e sleep: horários de acordar e dormir se o PDF disser; senão, vazio.
- title: curto e no imperativo (ex.: "Tomar creatina", "Caminhar 20 minutos").
- Se um afazer não tiver horário, use um horário típico para ele.
Não invente afazeres que não estejam no PDF.`,
  diet: `Este PDF é o plano alimentar de uma pessoa (feito por nutricionista ou por ela mesma).
Organize em refeições do dia, na ordem em que acontecem.
- name: nome da refeição (Café da manhã, Lanche da manhã, Almoço, Lanche da tarde, Jantar, Ceia, Pré-treino, Pós-treino...).
- time: horário no formato HH:MM. Se o PDF não disser, use um horário típico para aquela refeição.
- items: um alimento por linha, com a quantidade como está no PDF. Se houver opções de troca, coloque na mesma linha depois de "ou".
Não invente alimentos nem quantidades que não estejam no PDF. Se o plano tiver mais de uma opção de cardápio, use a opção 1 e cite as outras em notes.`,
  workout: `Este PDF é a ficha de treino de uma pessoa (feita por personal trainer ou por ela mesma).
Distribua os treinos pelos dias da semana.
- Se o PDF disser os dias, use esses dias.
- Se usar letras (A, B, C...) sem dias, distribua de segunda a sábado na ordem (A, B, C, A, B, C para 3 treinos; A, B, A, B... para 2; um por dia para 5 ou 6), deixando o domingo livre.
- Não crie dia de descanso; apenas não inclua o dia.
- items: um exercício por linha, no formato "Nome — séries x repetições", acrescentando descanso, carga ou técnica se o PDF trouxer.
Não invente exercícios que não estejam no PDF.`,
}

export async function parsePlan(kind, base64, lang = 'pt', mime = 'application/pdf') {
  const schema = kind === 'diet' ? DIET_SCHEMA : kind === 'routine' ? ROUTINE_SCHEMA : WORKOUT_SCHEMA
  const response = await getClient().beta.messages.create({
    model: MODEL,
    // se o modelo principal recusar, o próprio servidor da Anthropic tenta de novo com outro modelo
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    max_tokens: 16000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    messages: [
      {
        role: 'user',
        content: [
          mime === 'application/pdf' ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } : { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
          { type: 'text', text: `${PROMPTS[kind]}\nEscreva os nomes e textos em ${LANG_NAME[lang] || LANG_NAME.pt}, mantendo nomes de alimentos e exercícios reconhecíveis.` },
        ],
      },
    ],
  })
  if (response.stop_reason === 'refusal') return { readable: false }
  if (response.stop_reason === 'max_tokens') throw new Error('PDF longo demais para ler de uma vez')
  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) return { readable: false }
  return JSON.parse(text)
}
