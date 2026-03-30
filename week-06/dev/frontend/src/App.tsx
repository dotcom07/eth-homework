import { startTransition, useEffect, useRef } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import './App.css'
import {
  getRafflePhase,
  useContractMeta,
  useRaffleList,
} from './features/raffle/api'
import { OperatorScreen } from './features/operator/OperatorScreen'
import { UserScreen } from './features/user/UserScreen'
import { TopTabBar } from './components/layout/TopTabBar'
import { useOperatorDraftStore } from './stores/operatorDraftStore'
import { useUiStore } from './stores/uiStore'

function App() {
  const activeTab = useUiStore((state) => state.activeTab)
  const setActiveTab = useUiStore((state) => state.setActiveTab)
  const clearSelection = useUiStore((state) => state.clearSelection)
  const resetDraft = useOperatorDraftStore((state) => state.resetDraft)
  const { disconnect } = useDisconnect()
  const { isConnected } = useAccount()
  const previousTabRef = useRef(activeTab)

  const contractMeta = useContractMeta()
  const raffleList = useRaffleList()

  useEffect(() => {
    if (previousTabRef.current === activeTab) {
      return
    }

    if (isConnected) {
      disconnect()
    }

    clearSelection()
    resetDraft()
    previousTabRef.current = activeTab
  }, [activeTab, clearSelection, disconnect, isConnected, resetDraft])

  function handleTabChange(nextTab: 'operator' | 'user') {
    if (nextTab === activeTab) {
      return
    }

    startTransition(() => {
      setActiveTab(nextTab)
    })
  }

  const totalRaffles = raffleList.data?.length ?? 0
  const liveCount =
    raffleList.data?.filter((raffle) => getRafflePhase(raffle) === 'live').length ?? 0
  const drawnCount =
    raffleList.data?.filter((raffle) => getRafflePhase(raffle) === 'drawn').length ?? 0
  const eligibilityLabel =
    contractMeta.data?.minimumEligibleTierId === 0
      ? '전체 오픈'
      : `Tier ${contractMeta.data?.minimumEligibleTierId ?? '--'}부터`

  return (
    <div className="app-shell">
      <header className="hero-shell">
        <div className="hero-shell__glow hero-shell__glow--left" />
        <div className="hero-shell__glow hero-shell__glow--right" />

        <div className="hero-shell__content">
          <div className="eyebrow-row">
            <span className="eyebrow">Status L2</span>
            <span className="eyebrow eyebrow--soft">Fully Onchain Raffle</span>
          </div>

          <div className="hero-shell__heading">
            <div>
              <h1>Karma Raffle</h1>
              <p className="hero-copy">
                마음에 드는 래플을 고르고 바로 참여해보세요!
                당첨자 확정 버튼은 누구나 누를 수 있습니다!
              </p>
            </div>

            <div className="hero-metrics">
              <article className="metric-card">
                <span className="metric-label">전체 래플</span>
                <strong className="metric-value">{totalRaffles}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">참여 중</span>
                <strong className="metric-value">{liveCount}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">추첨 완료</span>
                <strong className="metric-value">{drawnCount}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">참여 기준</span>
                <strong className="metric-value">{eligibilityLabel}</strong>
              </article>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <TopTabBar activeTab={activeTab} onChange={handleTabChange} />

        <section className="mode-panel">
          {activeTab === 'operator' ? <OperatorScreen /> : <UserScreen />}
        </section>
      </main>
    </div>
  )
}

export default App
