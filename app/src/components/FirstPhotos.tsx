// Depois do "Como funciona": as duas fotos que dão sentido ao app (shape atual e shape referência).
import { useState } from 'react'
import { t } from '../i18n'
import { compress, putPhoto } from '../photos'
import { type AppState, type Profile, getProjeto, newId, setProjeto, setState } from '../store'
import { usePhotoUrl } from '../usePhotos'
import { Icon } from './Icon'
import { PhotoButtons } from './PhotoButtons'
import { editPhoto } from './PhotoEditor'
import { toast } from './Toast'

async function save(raw?: File) {
  const f = raw && (await editPhoto(raw, 3 / 4))
  if (!f) return null
  const id = newId()
  await putPhoto(id, await compress(f, 1100))
  return id
}

export function FirstPhotos({ s, onDone, embedded = false, profile }: { s: AppState; onDone?: () => void; embedded?: boolean; profile?: Profile }) {
  const pf = profile ?? s.profile
  const refId = getProjeto(s).vision.photoId
  const me = usePhotoUrl(s.startPhotoId)
  const ref = usePhotoUrl(refId)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const goal = pf.weightStart > pf.weightGoal ? t('{n} kg mais magro', { n: Math.round(pf.weightStart - pf.weightGoal) }) : t('mais forte')
  const prompt = t('Use esta foto minha e me mostre {g}, com o abdômen definido e mais músculo, mesma pose, mesma luz e mesmo lugar. Realista, sem filtro.', { g: goal })

  const pickMe = async (f?: File) => {
    setBusy(true)
    const id = await save(f)
    if (id) {
      setState((x) => ({ ...x, startPhotoId: id }))
      toast(t('Foto do seu shape atual salva'))
    }
    setBusy(false)
  }
  const pickRef = async (f?: File) => {
    setBusy(true)
    const id = await save(f)
    if (id) {
      setProjeto((p) => ({ ...p, vision: { ...p.vision, photoId: id } }))
      toast(t('Foto de referência salva'))
    }
    setBusy(false)
  }
  const both = !!s.startPhotoId && !!refId

  return (
    <div className={embedded ? 'fp-embed' : 'fp'} role={embedded ? undefined : 'dialog'} aria-modal={embedded ? undefined : true}>
      <div className="fp-in">
        {!embedded && <span className="eyebrow">{t('Último passo')}</span>}
        <h1>{t('Suas duas fotos')}</h1>
        <p className="lead">{t('Elas aparecem toda vez que você abre o app: quem você é hoje e quem você vai ser.')}</p>

        <section className="card fp-step">
          <div className="fp-h">
            <span className={`fp-n ${s.startPhotoId ? 'is-done' : ''}`}>{s.startPhotoId ? <Icon name="check" size={14} stroke={3} /> : 1}</span>
            <span>
              <b>{t('Selecione a foto do seu shape atual')}</b>
              <small>{t('Corpo inteiro, de frente, roupa de treino. Vira o seu "antes".')}</small>
            </span>
          </div>
          <div className={`fp-img ${me ? 'ok' : ''}`}>{me ? <img src={me} alt="" /> : <Icon name="camera" size={30} />}</div>
          <PhotoButtons onFile={pickMe} disabled={busy} />
        </section>

        <section className="card fp-step">
          <div className="fp-h">
            <span className={`fp-n ${refId ? 'is-done' : ''}`}>{refId ? <Icon name="check" size={14} stroke={3} /> : 2}</span>
            <span>
              <b>{t('Selecione a foto do seu shape referência')}</b>
              <small>{t('O corpo que você quer ter.')}</small>
            </span>
          </div>
          <div className="fp-tip">
            <b>
              <Icon name="star" size={15} /> {t('Dica: faça a sua com IA, para se visualizar')}
            </b>
            <small>{t('Abra o ChatGPT, o Gemini ou outro app de imagem, envie a sua foto e cole este pedido:')}</small>
            <p>"{prompt}"</p>
            <button
              type="button"
              className="link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prompt)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1800)
                } catch {
                  /* sem permissão */
                }
              }}
            >
              {copied ? t('Pedido copiado') : t('Copiar pedido')}
            </button>
            <small>{t('Salve a imagem que a IA criar e escolha ela aqui. Também vale uma foto sua de quando estava em forma.')}</small>
          </div>
          <div className={`fp-img ${ref ? 'ok' : ''}`}>{ref ? <img src={ref} alt="" /> : <Icon name="target" size={30} />}</div>
          <PhotoButtons onFile={pickRef} disabled={busy} />
        </section>

        {!embedded && (
          <button type="button" className="cta" onClick={onDone}>
            {both ? t('Continuar') : t('Continuar sem as fotos')}
          </button>
        )}
        {!both && <small className="muted center-txt">{t('Dá para escolher depois em Perfil > Editar fotos da abertura.')}</small>}
      </div>
    </div>
  )
}
