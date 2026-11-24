// Conversa com o treinador (IA): entende a objeção da pessoa e tenta levar a uma ação pequena agora.
// Usa ANTHROPIC_API_KEY. Sem a chave, o app usa o roteiro pronto do celular.
import Anthropic from '@anthropic-ai/sdk'

let client = null
const getClient = () => (client ??= new Anthropic())
export const coachReady = () => !!process.env.ANTHROPIC_API_KEY

const LANG = { pt: 'português do Brasil', en: 'English', es: 'español' }

function system(ctx) {
  const veteran = (ctx.streak || 0) >= 7
  return `Você é o treinador do app de disciplina fitness "${ctx.lang === 'en' ? 'No Excuses' : 'Sem Desculpa'}". Está conversando no chat com ${ctx.name || 'a pessoa'}, que hoje ainda não treinou.

Objetivo da conversa: entender o que está travando a pessoa e levá-la a se comprometer com UMA ação pequena e concreta agora (ex.: vestir a roupa de treino, sair de casa nos próximos 5 minutos, fazer só 20 minutos, chegar na academia). Missão do dia: chegar na academia.

Como falar:
- Responda em ${LANG[ctx.lang] || LANG.pt}.
- No máximo 3 frases curtas. A pessoa está desmotivada: nada de números, listas ou textos longos.
- Tom ${ctx.tone === 'sargento' ? 'duro e direto, sem humilhar' : ctx.tone === 'parceiro' ? 'firme, mas acolhedor' : 'direto, sem enrolação'}. Cobre a atitude, nunca o corpo da pessoa.
- ${veteran ? `Ela tem ${ctx.streak} dias seguidos: use identidade e o que ela perderia ("você não é mais quem desiste").` : 'Ela está começando: incentive, diminua o tamanho do passo, celebre qualquer movimento.'}
- Rebata a desculpa com um argumento real e termine sempre com uma pergunta de compromisso simples (sim/não ou um horário).
- Se ela citar dor, lesão, doença ou algo de saúde mental sério, não insista no treino: acolha, sugira descanso ou algo leve e, se for sério, procurar um profissional.
- Use o motivo dela quando ajudar.

Dados da pessoa:
- Dia ${ctx.day || 1} de ${ctx.cycle || 90} do projeto
- Treino de hoje: ${ctx.workout || 'não cadastrado'}${ctx.trainAt ? ` às ${ctx.trainAt}` : ''}
- Motivo: ${ctx.why || 'não informado'}
- Carta de compromisso: ${ctx.letter || 'não escrita'}`
}

export async function coachReply(ctx, messages) {
  const msgs = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && String(m.text || '').trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: String(m.text).slice(0, 600) }))
  while (msgs.length && msgs[0].role !== 'user') msgs.shift()
  if (!msgs.length) return null
  const response = await getClient().beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 1000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: system(ctx),
    messages: msgs,
  })
  if (response.stop_reason === 'refusal') return null
  return response.content.find((b) => b.type === 'text')?.text?.trim() || null
}
