// Tradução simples: o texto em português é a chave. t('Bom dia') → 'Good morning' em inglês.
// Variáveis entre chaves: t('faltam {n} dias', { n: 3 }).
// O dicionário fica em i18n-dict.ts. `npm run i18n:check` lista textos sem tradução.
import { DICT } from './i18n-dict'

export type Lang = 'pt' | 'en' | 'es'
export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'pt', label: 'Português', flag: '🇧🇷' },
  { id: 'en', label: 'English', flag: '🇺🇸' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
]

let current: Lang = 'pt'
export const setLangRuntime = (l: Lang) => {
  current = l
  try {
    document.documentElement.lang = l === 'pt' ? 'pt-BR' : l
  } catch {
    /* fora do navegador */
  }
}
export const getLang = () => current

export function detectLang(): Lang {
  try {
    const n = (navigator.language || 'pt').slice(0, 2).toLowerCase()
    return n === 'en' ? 'en' : n === 'es' ? 'es' : 'pt'
  } catch {
    return 'pt'
  }
}

export function tr(lang: Lang, s: string, vars?: Record<string, string | number>): string {
  let out = s
  if (lang !== 'pt') {
    const row = DICT[s]
    if (row) out = row[lang === 'en' ? 0 : 1]
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
  return out
}

export const t = (s: string, vars?: Record<string, string | number>) => tr(current, s, vars)

const WD: Record<Lang, string[]> = {
  pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
}
const WDS: Record<Lang, string[]> = {
  pt: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  es: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
}
export const weekday = (d: number) => WD[current][d]
export const weekdayShort = (d: number) => WDS[current][d]
