import { useCallback, useEffect, useRef, useState } from 'react'
import { type User, api, boot } from './api'
import { BottomNav, type Tab } from './components/BottomNav'
import { Icon } from './components/Icon'
import { Info } from './components/Info'
import { Intro } from './components/Intro'
import { getLang, t } from './i18n'
import { registerSW, setServerMode, startScheduler, subscribePush } from './notify'
import { Admin } from './screens/Admin'
import { Alerts } from './screens/Alerts'
import { Auth, Pending } from './screens/Auth'
import { Checkin } from './screens/Checkin'
import { Evolution } from './screens/Evolution'
import { Menu } from './screens/Menu'
import { Onboarding } from './screens/Onboarding'
import { Projeto } from './screens/Projeto'
import { Today } from './screens/Today'
import { resetToBlank, today, useAppState } from './store'
import { startSync } from './sync'
import { refreshEvents } from './calendar'

type Phase = 'loading' | 'local' | 'auth' | 'pending' | 'syncing' | 'ready'

export default function App() {
  const s = useAppState()
  const [phase, setPhase] = useState<Phase>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<Tab>('inicio')
  const [checkin, setCheckin] = useState(false)
  const [menuSec, setMenuSec] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const synced = useRef(false)
  const [intro, setIntro] = useState(true)

  // abertura de novo ao voltar para o app depois de 30 minutos fora
  useEffect(() => {
    let hiddenAt = 0
    const vis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 30 * 60_000) setIntro(true)
    }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [])

  const goMenu = (sec: string) => {
    setMenuSec(sec)
    setTab('menu')
  }

  const enter = useCallback(async (u: User | null) => {
    setUser(u)
    if (!u) return setPhase('auth')
    if (u.status !== 'approved') return setPhase('pending')
    setPhase('syncing')
    if (!synced.current) {
      synced.current = true
      await startSync(u.name)
    }
    void api.ping(getLang()).catch(() => {})
    void subscribePush()
    void refreshEvents(true)
    if (new URL(location.href).searchParams.get('integracao')) {
      setMenuSec('integracoes')
      setTab('menu')
    }
    if (u.role === 'admin') api.admin.users().then((r) => setPendingCount(r.users.filter((x) => x.status === 'pending').length)).catch(() => {})
    setPhase('ready')
  }, [])

  useEffect(() => {
    void registerSW()
    boot().then((b) => {
      if (b.mode === 'local') {
        setPhase('local')
        return
      }
      setServerMode(true)
      void enter(b.user)
    })
    const id = startScheduler() // só age no modo local
    return () => clearInterval(id)
  }, [enter])

  // registra uso quando o app volta para a tela (no máximo a cada 10 min)
  useEffect(() => {
    if (phase !== 'ready') return
    let last = Date.now()
    const vis = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > 600_000) {
        last = Date.now()
        void api.ping(getLang()).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [phase])

  useEffect(() => {
    document.documentElement.dataset.theme = s.theme
  }, [s.theme])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, checkin])

  const logout = async () => {
    await api.logout().catch(() => {})
    try {
      localStorage.removeItem('semdesculpa:v2')
    } catch {
      /* ignora */
    }
    location.reload()
  }

  if (phase === 'loading' || phase === 'syncing')
    return (
      <div className="splash">
        <span className="brand-mark">
          <Icon name="flame" size={34} />
        </span>
      </div>
    )
  if (phase === 'auth') return <Auth s={s} onUser={enter} />
  if (phase === 'pending' && user) return <Pending user={user} onUser={enter} onLogout={logout} />

  if (!s.onboarded) return <Onboarding p0={s.profile} s={s} userId={user?.id} hasServerAvatar={user?.hasAvatar} />
  if (checkin) return <Checkin s={s} onClose={() => setCheckin(false)} />

  const hhmm = new Date().toTimeString().slice(0, 5)
  const owes = !s.daily[today()] && hhmm >= s.profile.checkinTime
  const isAdmin = user?.role === 'admin'

  return (
    <div className="app">
      {intro && <Intro s={s} userId={user?.id} hasAvatar={user?.hasAvatar} onDone={() => setIntro(false)} />}
      {s.demo && phase === 'local' && (
        <div className="demo-bar">
          <span className="ttl">
            {t('Você está vendo dados de exemplo.')}
            <Info text={t('O app está preenchido com uma pessoa fictícia para você conhecer. Toque em Começar o meu para usar com os seus dados.')} />
          </span>
          <button type="button" onClick={resetToBlank}>
            {t('Começar o meu')} <Icon name="arrow" size={14} />
          </button>
        </div>
      )}
      {tab === 'inicio' && <Today s={s} user={user} go={setTab} goMenu={goMenu} openCheckin={() => setCheckin(true)} owes={owes} />}
      {tab === 'evolucao' && <Evolution s={s} openCheckin={() => setCheckin(true)} />}
      {tab === 'cobrancas' && <Alerts s={s} onBack={() => setTab('inicio')} />}
      {tab === 'projeto' && <Projeto s={s} />}
      {tab === 'menu' && <Menu s={s} user={user} onUser={setUser} onLogout={user ? logout : undefined} initialSec={menuSec} onOpened={() => setMenuSec(null)} />}
      {tab === 'admin' && isAdmin && <Admin onPending={setPendingCount} />}
      <BottomNav
        tab={tab}
        onTab={(x) => {
          setMenuSec(null)
          setTab(x)
        }}
        dots={{ admin: pendingCount > 0 }}
        admin={isAdmin}
      />
    </div>
  )
}
