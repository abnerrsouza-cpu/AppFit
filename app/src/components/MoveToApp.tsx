// Versão de demonstração (GitHub Pages): manda a pessoa para o app oficial com conta.
import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { sendToApp } from '../migrate'
import type { AppState } from '../store'
import { Icon } from './Icon'
import { APP_URL } from './LoginCta'

export function MoveToApp({ s }: { s: AppState }) {
  const hasData = !s.demo && s.onboarded
  const [busy, setBusy] = useState(false)
  // sem dados próprios: vai direto
  useEffect(() => {
    if (!hasData) location.replace(`${APP_URL}/`)
  }, [hasData])
  if (!hasData)
    return (
      <div className="splash">
        <span className="brand-mark">
          <Icon name="flame" size={34} />
        </span>
      </div>
    )
  return (
    <div className="move">
      <span className="move-ic">
        <Icon name="arrow" size={28} />
      </span>
      <h1>{t('O app mudou de endereço')}</h1>
      <p className="lead">{t('Esta é a versão de demonstração: aqui não tem conta, nada fica salvo no servidor e as cobranças não chegam com o app fechado.')}</p>
      <ol className="how-steps card">
        <li>
          <span>1</span>
          {t('Toque em Levar meus dados.')}
        </li>
        <li>
          <span>2</span>
          {t('Crie sua conta ou entre. Seu cadastro, rotina, treino, dieta e projetinho vão junto.')}
        </li>
        <li>
          <span>3</span>
          {t('Adicione o app novo à tela de início e apague o ícone antigo.')}
        </li>
      </ol>
      <button
        type="button"
        className="cta"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void sendToApp(s)
        }}
      >
        {busy ? t('Abrindo...') : t('Levar meus dados')} <Icon name="arrow" size={18} />
      </button>
      <button type="button" className="link" onClick={() => void sendToApp(null)}>
        {t('Começar do zero no app oficial')}
      </button>
      <small className="muted center-txt">{t('As fotos ficam neste aparelho. No app novo, envie de novo.')}</small>
    </div>
  )
}
