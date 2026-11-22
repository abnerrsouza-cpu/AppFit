// Busca os vídeos mais recentes dos canais em content/channels.json (feed RSS público do YouTube),
// filtra só o que é sobre treino/dieta, e grava public/content.json + src/content-snapshot.json.
// Roda todo dia no GitHub Actions (.github/workflows/conteudo.yml). Para rodar à mão: npm run content
import { readFile, writeFile } from 'node:fs/promises'

const channels = JSON.parse(await readFile(new URL('../content/channels.json', import.meta.url), 'utf8'))

const TOPIC =
  /trein|dieta|m[uú]sc|hipertrof|emagre|gordur|prote[ií]n|creatin|cardio|academia|suplement|exerc[ií]c|agach|supino|abd[oô]m|perna|bra[cç]o|peito|costas|ombro|gl[uú]teo|jejum|caloria|carbo|whey|bulking|cutting|shape|defini|for[cç]a|alimenta|comer|refei|sono|caminhada|peso|workout|muscle|\bfat\b|body fat|train|diet|protein|lift|squat|bench|deadlift|hypertrophy|\bgym\b|exercise|strength|calorie|weight loss|gains|recovery/i
const SKIP = /ao vivo|est[aá] ao vivo|\blive\b|gta|porsche/i

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

async function fetchChannel(ch) {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`)
  if (!r.ok) throw new Error(`${ch.name}: HTTP ${r.status}`)
  const xml = await r.text()
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const get = (re) => (e.match(re) || [])[1] || ''
    return {
      id: get(/<yt:videoId>([^<]+)</),
      title: decode(get(/<title>([^<]*)</)),
      url: get(/<link rel="alternate" href="([^"]+)"/),
      published: get(/<published>([^<]+)</),
      views: Number(get(/<media:statistics views="(\d+)"/)) || 0,
      channel: ch.name,
      lang: ch.lang || 'pt',
    }
  })
}

const videos = []
const ok = []
for (const ch of channels) {
  try {
    const list = await fetchChannel(ch)
    const good = list.filter((v) => v.id && TOPIC.test(v.title) && !SKIP.test(v.title)).map((v) => ({ ...v, short: v.url.includes('/shorts/') }))
    videos.push(...good.slice(0, 8))
    ok.push({ name: ch.name, id: ch.id, lang: ch.lang || 'pt', url: `https://www.youtube.com/channel/${ch.id}` })
    console.log(`ok ${ch.name}: ${good.length} vídeos relevantes`)
  } catch (e) {
    console.warn(`falhou ${ch.name}: ${e.message}`)
  }
}

if (!videos.length) {
  console.error('Nenhum vídeo obtido; mantendo o conteúdo anterior.')
  process.exit(0)
}

videos.sort((a, b) => b.published.localeCompare(a.published))
const out = {
  updatedAt: new Date().toISOString(),
  channels: ok,
  videos: videos.slice(0, 30).map(({ url, ...v }) => ({ ...v, url: v.short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}` })),
}
const json = JSON.stringify(out, null, 1)
await writeFile(new URL('../public/content.json', import.meta.url), json)
await writeFile(new URL('../src/content-snapshot.json', import.meta.url), json)
console.log(`gravados ${out.videos.length} vídeos`)
