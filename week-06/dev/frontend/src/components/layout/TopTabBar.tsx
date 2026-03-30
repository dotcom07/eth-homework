import type { ActiveTab } from '../../stores/uiStore'

type TopTabBarProps = {
  activeTab: ActiveTab
  onChange: (tab: ActiveTab) => void
}

export function TopTabBar({ activeTab, onChange }: TopTabBarProps) {
  return (
    <div className="tab-shell">
      <div className="tab-copy">
        <span className="section-kicker">Karma Raffle</span>
        <h2>한 화면에서 참여와 운영을 전환할 수 있어요</h2>
        <p>탭을 바꾸면 연결이 정리되고, 선택한 역할로 다시 시작합니다.</p>
      </div>

      <div className="tab-row" role="tablist" aria-label="Raffle mode tabs">
        <button
          type="button"
          className={activeTab === 'user' ? 'tab-button is-active' : 'tab-button'}
          onClick={() => onChange('user')}
        >
          참여
        </button>
        <button
          type="button"
          className={
            activeTab === 'operator' ? 'tab-button is-active' : 'tab-button'
          }
          onClick={() => onChange('operator')}
        >
          운영
        </button>
      </div>
    </div>
  )
}
