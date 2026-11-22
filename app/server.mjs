// Servidor do app em produção (Railway).
// Entrega o app (pasta dist).
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const DIST = join(import.meta.dirname, 'dist')
const PORT = Number(process.env.PORT) || 3000
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://x')
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
    let file = join(DIST, path)
    if (!file.startsWith(DIST)) throw new Error('fora')
    const s = await stat(file).catch(() => null)
    if (!s || s.isDirectory()) file = s?.isDirectory() ? join(file, 'index.html') : join(DIST, 'index.html')
    const body = await readFile(file)
    const ext = extname(file)
    const cache = ext === '.html' || ext === '.json' || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=31536000, immutable'
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache })
    res.end(body)
  } catch {
    res.writeHead(404).end('Não encontrado')
  }
}).listen(PORT, () => console.log(`App no ar na porta ${PORT}`))
