// Passo a passo para instalar o app na tela de início e ativar os avisos.
// Mostra só as instruções do aparelho da pessoa (iPhone, Android ou computador).
import { useState } from 'react'
import { t } from '../i18n'
import { enableNotifications, isIOS, isStandalone, notifyStatus } from '../notify'
import { Icon } from './Icon'

const isAndroid = () => /android/i.test(navigator.userAgent)

function Sub({ list }: { list: React.ReactNode[] }) {
  return (
    <ol className="ig-sub">
      {list.map((x, i) => (
        <li key={i}>
          <span>{i + 1}</span>
          <div>{x}</div>
        </li>
      ))}
    </ol>
  )
}

/** Instalar na tela de início: concluído se já está aberto pelo ícone. */
export function InstallStep() {
  const installed = isStandalone()
  if (installed) return <p className="ig-ok">{t('Pronto: você já está usando o app pelo ícone.')}</p>
  if (isIOS())
    return (
      <Sub
        list={[
          <>
            {t('Na barra do Safari, toque no botão Compartilhar')} <span className="ig-key"><Icon name="share" size={15} /></span> {t('(o quadrado com a seta para cima, embaixo no meio).')}
          </>,
          <>{t('Role a lista e toque em "Adicionar à Tela de Início".')}</>,
          <>{t('Toque em "Adicionar", no canto de cima.')}</>,
          <>{t('Feche o Safari e abra o app pelo ícone novo "Sem Desculpa" na tela do celular.')}</>,
        ]}
      />
    )
  if (isAndroid())
    return (
      <Sub
        list={[
          <>
            {t('No Chrome, toque nos três pontinhos')} <span className="ig-key">⋮</span> {t('no canto de cima.')}
          </>,
          <>{t('Toque em "Instalar app" (ou "Adicionar à tela inicial").')}</>,
          <>{t('Abra o app pelo ícone novo "Sem Desculpa" na tela do celular.')}</>,
        ]}
      />
    )
  return (
    <Sub
      list={[
        <>{t('Abra este mesmo endereço no navegador do seu celular:')} <b className="ig-url">{location.host}</b></>,
        <>{t('Entre com o mesmo e-mail e senha.')}</>,
        <>{t('Siga o passo a passo que vai aparecer lá para colocar o app na tela de início.')}</>,
      ]}
    />
  )
}

/** Ativar os avisos: só funciona depois de instalar no iPhone. */
export function NotifyStep({ okText, onGranted }: { okText?: string; onGranted?: () => void }) {
  const [st, setSt] = useState(notifyStatus())
  if (st === 'granted') return <p className="ig-ok">{okText ?? t('Avisos ativados.')}</p>
  if (st === 'default')
    return (
      <button
        type="button"
        className="cta ig-btn"
        onClick={async () => {
          const r = await enableNotifications()
          setSt(r)
          if (r === 'granted') onGranted?.()
        }}
      >
        <Icon name="bell" size={18} /> {t('Ativar avisos')}
      </button>
    )
  if (st === 'denied')
    return (
      <Sub
        list={
          isIOS()
            ? [t('Abra os Ajustes do iPhone e toque em Notificações.'), t('Toque em "Sem Desculpa" e ligue "Permitir Notificações".'), t('Volte para o app.')]
            : [t('Toque no cadeado ao lado do endereço do site.'), t('Em Permissões, libere Notificações.'), t('Recarregue o app.')]
        }
      />
    )
  return <p className="ig-wait">{t('Faça o passo de cima primeiro. Abrindo o app pelo ícone, o botão "Ativar avisos" aparece aqui.')}</p>
}
