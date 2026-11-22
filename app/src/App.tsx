import { useEffect, useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { Icon } from './components/Icon'
import { registerSW, startScheduler } from './notify'
import { Alerts } from './screens/Alerts'
import { Checkin } from './screens/Checkin'
import { Evolution } from './screens/Evolution'
import { Menu } from './screens/Menu'
import { News } from './screens/News'
import { Onboarding } from './screens/Onboarding'
import { Today } from './screens/Today'
import { resetToBlank, today, useAppState } from './store'

export default function App() {
  const s = useAppState()
  const [tab, setTab] = useState<Tab>('inicio')
  const [checkin, setCheckin] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = s.theme
  }, [s.theme])

  useEffect(() => {
    void registerSW()
    const id = startScheduler()
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, checkin])

  if (!s.onboarded) return <Onboarding p0={s.profile} />
  if (checkin) return <Checkin s={s} onClose={() => setCheckin(false)} />

  const hhmm = new Date().toTimeString().slice(0, 5)
  const owes = !s.daily[today()] && hhmm >= s.profile.checkinTime

  return (
    <div className="app">
      {s.demo && (
        <div className="demo-bar">
          <span>Você está vendo dados de exemplo.</span>
          <button type="button" onClick={resetToBlank}>
            Começar o meu <Icon name="arrow" size={14} />
          </button>
        </div>
      )}
      {tab === 'inicio' && <Today s={s} go={setTab} openCheckin={() => setCheckin(true)} owes={owes} />}
      {tab === 'evolucao' && <Evolution s={s} />}
      {tab === 'cobrancas' && <Alerts s={s} onBack={() => setTab('inicio')} />}
      {tab === 'noticias' && <News />}
      {tab === 'menu' && <Menu s={s} />}
      <BottomNav tab={tab} onTab={setTab} dots={{}} />
    </div>
  )
}
