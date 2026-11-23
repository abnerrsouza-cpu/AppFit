// Levar os dados da versão de demonstração (GitHub Pages) para o app oficial com conta (Railway).
// Os dados vão no endereço (#importar=...), comprimidos. As fotos ficam no aparelho antigo.
import { APP_URL } from './components/LoginCta'
import { type AppState, getState, setState } from './store'

const KEY = 'sd:import'
export const isDemoHost = () => location.hostname.endsWith('github.io')

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function gzip(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
async function gunzip(bytes: Uint8Array) {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

/** Tira referências a fotos (elas ficam no aparelho antigo e não existem no app novo). */
function withoutPhotos(s: AppState): AppState {
  const weekly = Object.fromEntries(Object.entries(s.weekly).map(([k, w]) => [k, { ...w, photoId: undefined }]))
  return {
    ...s,
    demo: false,
    startPhotoId: undefined,
    profile: { ...s.profile, avatarId: undefined },
    weekly,
    projeto: s.projeto ? { ...s.projeto, vision: { ...s.projeto.vision, photoId: undefined }, photos: [] } : s.projeto,
  }
}

export async function sendToApp(s: AppState | null) {
  if (!s) return location.assign(`${APP_URL}/?criar=1`)
  const json = JSON.stringify(withoutPhotos(s))
  let payload: string
  try {
    payload = 'z' + b64url(await gzip(json))
  } catch {
    payload = 'r' + b64url(new TextEncoder().encode(json))
  }
  location.assign(`${APP_URL}/?criar=1#importar=${payload}`)
}

/** No app oficial: guarda o que veio no endereço até a pessoa entrar na conta. */
export async function captureImport() {
  const m = /#importar=([zr])([A-Za-z0-9_-]+)/.exec(location.hash)
  if (!m) return
  history.replaceState(null, '', location.pathname + location.search)
  try {
    const bytes = fromB64url(m[2])
    const json = m[1] === 'z' ? await gunzip(bytes) : new TextDecoder().decode(bytes)
    JSON.parse(json)
    localStorage.setItem(KEY, json)
  } catch {
    /* link quebrado: ignora */
  }
}

/** Depois de entrar e carregar a conta: aplica os dados trazidos se a conta ainda estiver vazia. */
export function applyImport(): 'imported' | 'kept' | null {
  let json: string | null = null
  try {
    json = localStorage.getItem(KEY)
    localStorage.removeItem(KEY)
  } catch {
    return null
  }
  if (!json) return null
  if (getState().onboarded) return 'kept'
  const data = JSON.parse(json) as AppState
  setState((cur) => ({ ...data, demo: false, lang: cur.lang ?? data.lang, theme: cur.theme }))
  return 'imported'
}
