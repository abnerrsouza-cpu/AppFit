// Lê o texto de uma dieta (colado do PDF do nutricionista) e separa as refeições, sem IA.
import type { Profile } from './store'

export interface ParsedDiet {
  meals: { name: string; time: string; items: string }[]
  waterMl?: number
  supplements: string[]
}

const MEAL = /^(caf[eé]( da manh[aã])?|desjejum|cola[cç][aã]o|lanche( da (manh[aã]|tarde))?|almo[cç]o|pr[eé][\s-]?treino|p[oó]s[\s-]?treino|jantar?|janta|ceia|refei[cç][aã]o\s*\d+|breakfast|lunch|dinner|snack|pre[\s-]?workout|post[\s-]?workout|desayuno|almuerzo|cena|merienda)(?![a-zà-ú])/i
const STOP = /^(informa[cç][oõ]es|observa[cç][oõ]es|orienta[cç][oõ]es|refei[cç][aã]o livre|l[ií]quidos|dicas|notes?|important)/i
const bullet = (l: string) => l.replace(/^[\s●•▪◦*·\-–—]+/, '').trim()
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const toMin = (h: string) => {
  const [a, b] = h.split(':').map(Number)
  return Number.isFinite(a) ? a * 60 + (b || 0) : NaN
}

function defaultTime(name: string, p: Profile) {
  const n = name.toLowerCase()
  const wake = toMin(p.wake) || 390
  const train = toMin(p.trainTime) || 1080
  if (/caf|desjejum|breakfast|desayuno/.test(n)) return hhmm(wake + 30)
  if (/cola|manh|morning/.test(n)) return '10:00'
  if (/almo|lunch|almuerzo/.test(n)) return '12:30'
  if (/pr[eé].?treino|pre.?workout/.test(n)) return hhmm(Math.max(13 * 60 + 30, train - 60))
  if (/p[oó]s.?treino|post.?workout/.test(n)) return hhmm(train + 75)
  if (/lanche|tarde|snack|merienda/.test(n)) return '16:00'
  if (/jant|dinner|cena/.test(n)) return hhmm(Math.max(19 * 60 + 30, Math.min(21 * 60 + 30, train + 120)))
  if (/ceia/.test(n)) return '22:00'
  return '12:00'
}

export function parseDietText(text: string, p: Profile): ParsedDiet {
  const out: ParsedDiet = { meals: [], supplements: [] }
  let cur: { name: string; time: string; items: string[] } | null = null
  let stopped = false
  for (const raw of text.split(/\r?\n/)) {
    const line = bullet(raw)
    if (!line) continue
    // metas gerais: água e suplementos
    const w = line.match(/(\d+(?:[.,]\d+)?)\s*(l|litros?|ml)(?![a-z])[^.]*?(água|agua|water)/i) || line.match(/(água|agua|water)[^.\d]*(\d+(?:[.,]\d+)?)\s*(l|litros?|ml)(?![a-z])/i)
    if (w && !cur) {
      const num = Number((w[1].match(/\d/) ? w[1] : w[2]).replace(',', '.'))
      const unit = (w[1].match(/\d/) ? w[2] : w[3]).toLowerCase()
      const ml = unit === 'ml' ? num : num * 1000
      if (ml >= 500 && ml <= 10000) out.waterMl = Math.round(ml)
      continue
    }
    if (/creatina|creatine|whey|multivitam|[oô]mega/i.test(line) && !cur && line.length < 60) {
      out.supplements.push(cap(line.replace(/\b(por )?dia\b/i, '').replace(/\s+/g, ' ').trim()))
      continue
    }
    if (STOP.test(line)) {
      stopped = true
      cur = null
      continue
    }
    const head = line.replace(/\s*:$/, '').trim()
    const m = head.match(MEAL)
    const looksHead = /:\s*$/.test(line) || /^\s*[●•▪]/.test(raw) || head.length <= 25
    if (m && head.length <= 45 && looksHead) {
      stopped = false
      const t = head.match(/(\d{1,2})[:h](\d{2})?/)
      const name = cap(head.replace(/\(?\s*\d{1,2}[:h]\d{0,2}\s*\)?/, '').replace(/[-–:]\s*$/, '').trim())
      cur = { name, time: t ? hhmm(Number(t[1]) * 60 + Number(t[2] || 0)) : defaultTime(name, p), items: [] }
      out.meals.push(cur as unknown as ParsedDiet['meals'][number])
      continue
    }
    if (cur && !stopped) cur.items.push(cap(line))
  }
  out.meals = (out.meals as unknown as { name: string; time: string; items: string[] }[])
    .filter((x) => x.items.length)
    .map((x) => ({ name: x.name, time: x.time, items: x.items.join('\n') }))
    .sort((a, b) => a.time.localeCompare(b.time))
  return out
}
