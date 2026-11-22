// Lista os textos do app que passam pela tradução e mostra quais não têm inglês/espanhol.
// Uso: npm run i18n:check   (--json imprime só as chaves que faltam, em JSON)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../src/', import.meta.url).pathname
const files = []
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : /\.tsx?$/.test(f) && files.push(join(d, f))))
walk(root)

const LIT = `'((?:[^'\\\\]|\\\\.)*)'`
const unesc = (s) => s.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\')
const keys = new Set()
const addAll = (txt, re) => {
  for (const m of txt.matchAll(re)) keys.add(unesc(m[1]))
}

for (const f of files) {
  if (f.endsWith('i18n-dict.ts')) continue
  const src = readFileSync(f, 'utf8')
  addAll(src, new RegExp(`\\b(?:t|L)\\(\\s*${LIT}`, 'g'))
  // t({ chave: 'texto', ... }[x])
  for (const m of src.matchAll(/\bt\(\s*\{([\s\S]*?)\}\s*\[/g)) addAll(m[1], new RegExp(`:\\s*${LIT}`, 'g'))
  // rótulos usados com t(variável)
  addAll(src, new RegExp(`\\b(?:label|l):\\s*${LIT}`, 'g'))
  addAll(src, new RegExp(`\\bl="([^"]+)"`, 'g'))
}
const block = (file, start) => {
  const src = readFileSync(join(root, file), 'utf8')
  const i = src.indexOf(start)
  if (i < 0) return ''
  let depth = 0
  const eq = src.indexOf('=', i)
  for (let j = eq; j < src.length; j++) {
    if (src[j] === '{' || src[j] === '[') depth++
    if (src[j] === '}' || src[j] === ']') {
      depth--
      if (depth === 0) return src.slice(eq, j + 1)
    }
  }
  return src.slice(i)
}
const allLits = (txt) => addAll(txt, new RegExp(LIT, 'g'))
allLits(block('psych.ts', 'const BANK'))
allLits(block('psych.ts', 'const TITLES'))
allLits(block('screens/Projeto.tsx', 'const REPLY'))
addAll(block('content.ts', 'export const CAT_STYLE'), new RegExp(`name:\\s*${LIT}`, 'g'))
const arts = block('content.ts', 'export const ARTICLES')
addAll(arts, new RegExp(`\\b(?:title|summary|h|p):\\s*${LIT}`, 'g'))
for (const m of arts.matchAll(/takeaway:\s*\[([\s\S]*?)\]/g)) allLits(m[1])
// listas de opções
for (const f of ['screens/Menu.tsx', 'screens/Onboarding.tsx']) {
  for (const m of readFileSync(join(root, f), 'utf8').matchAll(/\[('Perder gordura'[^\]]*)\]/g)) allLits(m[1])
}
for (const m of readFileSync(join(root, 'screens/Checkin.tsx'), 'utf8').matchAll(new RegExp(`\\[\\s*${LIT},\\s*'[^']*'\\s*\\]`, 'g'))) keys.add(unesc(m[1]))
;['Esteira'].forEach((k) => keys.add(k))

// remove chaves técnicas
const skip = (k) => !/[A-Za-zÀ-ú]/.test(k) || /^[a-z_]+$/.test(k) && !['meta', 'metas', 'dias', 'hoje', 'ontem', 'modo', 'você', 'início', 'sem.'].includes(k)
const list = [...keys].filter((k) => !skip(k)).sort()

const dictSrc = readFileSync(join(root, 'i18n-dict.ts'), 'utf8')
const have = new Set([...dictSrc.matchAll(/^\s*("(?:[^"\\]|\\.)*"):/gm)].map((m) => JSON.parse(m[1])))
const missing = list.filter((k) => !have.has(k))
if (process.argv.includes('--json')) console.log(JSON.stringify(missing, null, 1))
else {
  console.log(`${list.length} textos, ${missing.length} sem tradução`)
  missing.slice(0, 40).forEach((k) => console.log(' -', k))
  if (missing.length) process.exitCode = 1
}
