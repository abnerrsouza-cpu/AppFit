import { useCallback, useEffect, useRef, useState } from 'react'
import { type User, api, boot } from './api'
import { BottomNav, type Tab } from './components/BottomNav'
import { Icon } from './components/Icon'
import { Info } from './components/Info'
import { Intro } from './components/Intro'
import { HowItWorks } from './components/HowItWorks'
import { Celebrate } from './components/Celebrate'
import { Victory } from './components/Victory'
import { type Mission, levelOf, medals, projetoTodo, totalXP } from './game'
import { Conquistas } from './screens/Conquistas'
import { getLang, t } from './i18n'
import { registerSW, setServerMode, startScheduler, subscribePush } from './notify'
import { Admin } from './screens/Admin'
import { Alerts } from './screens/Alerts'
import { Auth, Pending } from './screens/Auth'
import { Checkin } from './screens/Checkin'
import { Evolution } from './screens/Evolution'
import { Menu } from './screens/Menu'
import { Onboarding } from './screens/Onboarding'
import { Projeto, type Sec as PjSec } from './screens/Projeto'
import { Today } from './screens/Today'
import { Ranking } from './screens/Ranking'
import { Plano } from './screens/Plano'
import { Agua } from './screens/Agua'
import { Toaster, toast } from './components/Toast'
import { applyImport, captureImport, isDemoHost } from './migrate'
import { MoveToApp } from './components/MoveToApp'
import { FirstPhotos } from './components/FirstPhotos'
import { CoachChat, coachShouldOpen } from './components/CoachChat'
import { TrainGate } from './components/TrainGate'
import { trainLocked } from './focus'
import { getProjeto, resetToBlank, setState, today, useAppState } from './store'
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
  const [openWeekly, setOpenWeekly] = useState(false)
  const [pjSec, setPjSec] = useState<PjSec | undefined>(undefined)
  const [howAgain, setHowAgain] = useState(false)
  const [rankNotice, setRankNotice] = useState<string | null>(null)
  const [fpOpen, setFpOpen] = useState(false)
  const [coach, setCoach] = useState(false)
  const [gate, setGate] = useState(false)
  const fpWanted = s.onboarded && !s.demo && !!s.seenHow && !s.photosAsked && !(s.startPhotoId && getProjeto(s).vision.photoId)
  useEffect(() => {
    if (fpWanted) setFpOpen(true)
  }, [fpWanted])

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

  // convite de amigo ou grupo (?amigo=CODIGO / ?grupo=CODIGO): guarda até a conta estar aprovada
  const acceptInvite = useCallback(async () => {
    let inv: { kind: 'amigo' | 'grupo'; code: string } | null = null
    try {
      inv = JSON.parse(localStorage.getItem('sd:invite') || 'null')
    } catch {
      /* ignora */
    }
    if (!inv) return
    try {
      if (inv.kind === 'amigo') {
        const r = await api.joinFriend(inv.code)
        setRankNotice(t('Agora você e {n} estão no mesmo ranking.', { n: r.name.split(' ')[0] }))
      } else {
        const r = await api.joinGroup(inv.code)
        setRankNotice(t('Você entrou no grupo {g}.', { g: r.group.name }))
      }
      setTab('ranking')
    } catch {
      /* convite inválido ou próprio: ignora */
    }
    try {
      localStorage.removeItem('sd:invite')
    } catch {
      /* ignora */
    }
  }, [])

  const enter = useCallback(async (u: User | null) => {
    setUser(u)
    if (!u) return setPhase('auth')
    if (u.status !== 'approved') return setPhase('pending')
    setPhase('syncing')
    if (!synced.current) {
      synced.current = true
      await startSync(u.name)
      const imp = applyImport()
      if (imp === 'imported') setTimeout(() => toast(t('Seus dados foram trazidos para a conta.'), t('As fotos ficaram no aparelho antigo: envie de novo.')), 1500)
      if (imp === 'kept') setTimeout(() => toast(t('Sua conta já tinha dados.'), t('Mantive os dados da conta.')), 1500)
    }
    void api.ping(getLang()).catch(() => {})
    void subscribePush()
    void refreshEvents(true)
    // veio de uma notificação: abre direto na tela certa
    {
      const u = new URL(location.href)
      const abrir = u.searchParams.get('abrir')
      if (abrir) {
        u.searchParams.delete('abrir')
        history.replaceState(null, '', u.pathname + u.search)
        if (abrir === 'checkin') setCheckin(true)
        else if (abrir === 'coach') setCoach(true)
        else if (abrir === 'plano') setTab('plano')
        else if (abrir === 'evolucao') setTab('evolucao')
        else if (abrir === 'semanal') {
          setOpenWeekly(true)
          setTab('evolucao')
        } else if (abrir === 'promessas') {
          setPjSec('promessas')
          setTab('projeto')
        } else if (abrir === 'dia') {
          try {
            sessionStorage.setItem('sd:view', 'dia')
          } catch {
            /* ignora */
          }
        }
      }
    }
    if (new URL(location.href).searchParams.get('integracao')) {
      setMenuSec('integracoes')
      setTab('menu')
    }
    void acceptInvite()
    if (u.role === 'admin') api.admin.users().then((r) => setPendingCount(r.users.filter((x) => x.status === 'pending').length)).catch(() => {})
    setPhase('ready')
  }, [acceptInvite])

  useEffect(() => {
    void registerSW()
    void captureImport()
    {
      const sp = new URL(location.href).searchParams
      const code = sp.get('amigo') || sp.get('grupo')
      if (code) {
        try {
          localStorage.setItem('sd:invite', JSON.stringify({ kind: sp.get('amigo') ? 'amigo' : 'grupo', code }))
        } catch {
          /* ignora */
        }
        sp.delete('amigo')
        sp.delete('grupo')
        history.replaceState(null, '', location.pathname + (sp.toString() ? `?${sp}` : ''))
      }
    }
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

  // nome do app no idioma: Sem Desculpa (pt) / No Excuses (en)
  useEffect(() => {
    const name = t('Sem Desculpa')
    document.title = name
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', name)
    document.documentElement.lang = s.lang === 'en' ? 'en' : s.lang === 'es' ? 'es' : 'pt-BR'
  }, [s.lang])

  useEffect(() => {
    document.querySelector('.app')?.scrollTo(0, 0)
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

  const onMission = (a: Mission['action']) => {
    setOpenWeekly(false)
    setPjSec(undefined)
    if (a === 'checkin') return setCheckin(true)
    if (a === 'semanal') {
      setOpenWeekly(true)
      return setTab('evolucao')
    }
    if (a === 'referencia') {
      setPjSec('expectativa')
      return setTab('projeto')
    }
    if (a === 'promessas') {
      setPjSec('promessas')
      return setTab('projeto')
    }
    if (a === 'dieta' || a === 'carta' || a === 'integracoes') return goMenu(a)
  }

  // comemorações: medalha nova ou nível novo (só depois do cadastro e fora do exemplo)
  const unlocked = s.onboarded && !s.demo ? medals(s).filter((m) => m.unlocked) : []
  const lvNow = levelOf(totalXP(s))
  const fresh = s.seenMedals ? unlocked.find((m) => !s.seenMedals!.includes(m.id)) : undefined
  const levelUp = s.lastLevel !== undefined && lvNow.n > s.lastLevel
  useEffect(() => {
    // primeira vez: registra o que já existe sem comemorar tudo de uma vez
    if (s.onboarded && !s.demo && (!s.seenMedals || s.lastLevel === undefined))
      setState((st) => ({ ...st, seenMedals: st.seenMedals ?? unlocked.map((m) => m.id), lastLevel: st.lastLevel ?? lvNow.n }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.onboarded, s.demo])

  // tela de vitória: quando o treino de hoje passa de "não feito" para "feito" (em qualquer tela)
  const trainedNow = !!s.checks[today()]?.train
  const prevTrained = useRef<boolean | null>(null)
  const [victory, setVictory] = useState(false)
  useEffect(() => {
    if (prevTrained.current === false && trainedNow && s.onboarded && !s.demo) {
      setVictory(true)
      const n = new Date()
      const at = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
      setState((x) => ({ ...x, trainDoneAt: { ...(x.trainDoneAt || {}), [today()]: at } }))
    }
    prevTrained.current = trainedNow
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainedNow])

  // dia ruim: depois da abertura, o treinador puxa conversa (no máximo a cada 3 horas)
  useEffect(() => {
    if (!intro && phase === 'ready' && !fpOpen && coachShouldOpen(s)) setCoach(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro, phase, fpOpen])

  if (phase === 'loading' || phase === 'syncing')
    return (
      <div className="splash">
        <span className="brand-mark">
          <Icon name="flame" size={34} />
        </span>
      </div>
    )
  if (phase === 'local' && isDemoHost()) return <MoveToApp s={s} />
  if (phase === 'auth') return <Auth s={s} onUser={enter} />
  if (phase === 'pending' && user) return <Pending user={user} onUser={enter} onLogout={logout} />

  if (!s.onboarded) return <Onboarding p0={s.profile} s={s} userId={user?.id} hasServerAvatar={user?.hasAvatar} />
  if (checkin) return <Checkin s={s} onClose={() => setCheckin(false)} />

  const hhmm = new Date().toTimeString().slice(0, 5)
  const owes = !s.daily[today()] && hhmm >= s.profile.checkinTime
  const isAdmin = user?.role === 'admin'
  // depois do "Como funciona", uma vez: shape atual e shape referência (fica aberta até a pessoa tocar em Continuar)
  const needPhotos = fpOpen && !intro && !howAgain

  return (
    <div className="app">
      {!intro && (howAgain || (!s.seenHow && !s.demo)) && (
        <HowItWorks
          onDone={() => {
            setHowAgain(false)
            setState((st) => ({ ...st, seenHow: true }))
          }}
        />
      )}
      {gate && <TrainGate onClose={() => setGate(false)} onCoach={() => setCoach(true)} />}
      {coach && !intro && <CoachChat s={s} online={!!user} onClose={() => setCoach(false)} />}
      {needPhotos && (
        <FirstPhotos
          s={s}
          onDone={() => {
            setFpOpen(false)
            setState((st) => ({ ...st, photosAsked: true }))
          }}
        />
      )}
      {!intro && !victory && s.seenHow && !howAgain && !checkin && !needPhotos && fresh && (
        <Celebrate kind="medal" icon={fresh.icon} title={fresh.title} desc={fresh.desc} onClose={() => setState((st) => ({ ...st, seenMedals: [...(st.seenMedals || []), fresh.id] }))} />
      )}
      {!intro && !victory && s.seenHow && !howAgain && !checkin && !needPhotos && !fresh && levelUp && (
        <Celebrate
          kind="level"
          icon="star"
          title={t('Nível {n}: {x}', { n: lvNow.n, x: lvNow.name })}
          desc={t('Você está cumprindo o que prometeu. Continue assim e o próximo nível vem rápido.')}
          onClose={() => setState((st) => ({ ...st, lastLevel: lvNow.n }))}
        />
      )}
      {victory && <Victory s={s} onClose={() => setVictory(false)} />}
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
      {tab === 'inicio' && <Today s={s} user={user} onMission={onMission} go={setTab} goMenu={goMenu} openCheckin={() => setCheckin(true)} owes={owes} openCoach={() => setCoach(true)} onLocked={() => setGate(true)} />}
      {tab === 'evolucao' && <Evolution key={openWeekly ? 'w' : 'n'} s={s} openWeekly={openWeekly} openCheckin={() => setCheckin(true)} />}
      {tab === 'cobrancas' && <Alerts s={s} onBack={() => setTab('inicio')} />}
      {tab === 'projeto' && <Projeto key={pjSec || 'x'} s={s} initialSec={pjSec} />}
      {tab === 'conquistas' && <Conquistas s={s} onBack={() => setTab('inicio')} />}
      {tab === 'plano' && <Plano s={s} goMenu={goMenu} />}
      {tab === 'agua' && <Agua s={s} onBack={() => setTab('inicio')} />}
      {tab === 'ranking' && <Ranking online={!!user} notice={rankNotice} />}
      {tab === 'menu' && <Menu s={s} user={user} onUser={setUser} onHow={() => setHowAgain(true)} onConquistas={() => setTab('conquistas')} onRanking={() => setTab('ranking')} onPlano={() => setTab('plano')} onAgua={() => setTab('agua')} onAdmin={isAdmin ? () => setTab('admin') : undefined} adminPending={pendingCount} onPreviewIntro={() => setIntro(true)} onLogout={user ? logout : undefined} initialSec={menuSec} onOpened={() => setMenuSec(null)} />}
      {tab === 'admin' && isAdmin && <Admin onPending={setPendingCount} onBack={() => setTab('menu')} />}
      <Toaster />
      <BottomNav
        tab={tab}
        onTab={(x) => {
          setMenuSec(null)
          setOpenWeekly(false)
          setPjSec(undefined)
          setTab(x)
        }}
        dots={{ menu: isAdmin && pendingCount > 0, projeto: tab !== 'projeto' && projetoTodo(s).total > 0 }}
        admin={isAdmin}
        locked={trainLocked(s) ? ['evolucao', 'projeto', 'ranking'] : []}
        onLocked={() => setGate(true)}
      />
    </div>
  )
}
