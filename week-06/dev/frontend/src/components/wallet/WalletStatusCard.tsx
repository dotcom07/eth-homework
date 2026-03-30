import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { STATUS_TESTNET_CHAIN_ID } from '../../contracts/karmaRaffle'
import { formatAddress } from '../../features/raffle/api'

type WalletStatusCardProps = {
  mode: 'operator' | 'user'
}

export function WalletStatusCard({ mode }: WalletStatusCardProps) {
  const { address, chainId, isConnected } = useAccount()
  const { connect, connectors, isPending: isConnectPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitchPending } = useSwitchChain()

  const primaryConnector = connectors[0]
  const isWrongChain = Boolean(isConnected && chainId !== STATUS_TESTNET_CHAIN_ID)
  const disconnectedTitle =
    mode === 'operator'
      ? '운영 지갑을 연결하고 새 라운드를 열어보세요'
      : '지갑을 연결하고 바로 응모해보세요'
  const disconnectedCopy =
    mode === 'operator'
      ? '운영 권한이 있는 Status Testnet 지갑만 래플을 만들 수 있어요.'
      : 'Status Testnet 지갑으로 래플 참여와 당첨 확인이 가능합니다.'

  return (
    <article className="wallet-card">
      <div className="wallet-card__copy">
        <span className="section-kicker">
          {mode === 'operator' ? '운영 지갑' : '참여 지갑'}
        </span>
        <h3>{isConnected ? '지갑이 연결되어 있어요' : disconnectedTitle}</h3>
        <p>
          {isConnected && address
            ? `${formatAddress(address)} · chain ${chainId}`
            : disconnectedCopy}
        </p>
      </div>

      <div className="wallet-card__actions">
        {!isConnected && primaryConnector ? (
          <button
            type="button"
            className="primary-button"
            onClick={() => connect({ connector: primaryConnector })}
            disabled={isConnectPending}
          >
            {isConnectPending ? '연결 중...' : '지갑 연결'}
          </button>
        ) : null}

        {isWrongChain ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => switchChain({ chainId: STATUS_TESTNET_CHAIN_ID })}
            disabled={isSwitchPending}
          >
            {isSwitchPending ? '전환 중...' : 'Status Testnet으로 전환'}
          </button>
        ) : null}

        {isConnected ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => disconnect()}
          >
            연결 해제
          </button>
        ) : null}
      </div>
    </article>
  )
}
