import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { type Hex } from 'viem'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { WalletStatusCard } from '../../components/wallet/WalletStatusCard'
import {
  formatAddress,
  formatEligibilityReason,
  formatUnixTime,
  getRafflePhase,
  getRafflePhaseLabel,
  type RaffleRecord,
  useCanEnter,
  useRaffleList,
  useTierInfo,
} from '../raffle/api'
import {
  KARMA_RAFFLE_ABI,
  KARMA_RAFFLE_ADDRESS,
  STATUS_TESTNET_CHAIN_ID,
} from '../../contracts/karmaRaffle'
import { useUiStore } from '../../stores/uiStore'

function getRaffleSummary(raffle: RaffleRecord) {
  return (
    raffle.metadata?.prizeLabel ??
    raffle.metadata?.description ??
    '추첨이 끝나면 우승자에게 NFT가 발행됩니다.'
  )
}

function getRaffleArtworkLabel(raffle: RaffleRecord) {
  return raffle.metadata?.prizeLabel ?? raffle.name
}

function getEnterButtonLabel(phase: ReturnType<typeof getRafflePhase>) {
  switch (phase) {
    case 'upcoming':
      return '아직 열리지 않은 래플입니다'
    case 'ready':
      return '이미 마감된 래플입니다'
    default:
      return '응모하기'
  }
}

function formatCountdown(totalSeconds: number) {
  const normalizedSeconds = Math.max(0, totalSeconds)
  const days = Math.floor(normalizedSeconds / 86_400)
  const hours = Math.floor((normalizedSeconds % 86_400) / 3_600)
  const minutes = Math.floor((normalizedSeconds % 3_600) / 60)
  const seconds = normalizedSeconds % 60
  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  if (days > 0) {
    return `${days}일 ${hh}:${mm}:${ss}`
  }

  return `${hh}:${mm}:${ss}`
}

function getRaffleCountdownLabel(
  raffle: Pick<RaffleRecord, 'canceled' | 'drawn' | 'startTime' | 'endTime'>,
  now: number,
) {
  const phase = getRafflePhase(raffle, now)
  const nowInSeconds = Math.floor(now / 1000)

  switch (phase) {
    case 'upcoming':
      return `오픈까지 ${formatCountdown(Number(raffle.startTime) - nowInSeconds)}`
    case 'live':
      return `마감까지 ${formatCountdown(Number(raffle.endTime) - nowInSeconds)}`
    case 'ready':
      return '마감됨'
    case 'drawn':
      return '추첨 완료'
    case 'canceled':
      return '취소됨'
  }
}

function RaffleArtwork({
  raffle,
  className,
}: {
  raffle: RaffleRecord
  className: string
}) {
  if (raffle.metadata?.imageUrl) {
    return (
      <img
        className={className}
        src={raffle.metadata.imageUrl}
        alt={getRaffleArtworkLabel(raffle)}
        loading="lazy"
      />
    )
  }

  return <div className={className}>{raffle.name.slice(0, 2).toUpperCase()}</div>
}

export function UserScreen() {
  const { address, chainId, isConnected } = useAccount()
  const selectedRaffleId = useUiStore((state) => state.selectedRaffleId)
  const setSelectedRaffleId = useUiStore((state) => state.setSelectedRaffleId)
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => Date.now())

  const rafflesQuery = useRaffleList()
  const tierInfoQuery = useTierInfo(address)
  const visibleRaffles =
    rafflesQuery.data?.filter((raffle) => {
      const isExpiredEmpty =
        getRafflePhase(raffle, now) === 'ready' &&
        Number(raffle.totalEntries) === 0

      return !isExpiredEmpty
    }) ?? []
  const selectedRaffle =
    visibleRaffles.find((raffle) => raffle.id === selectedRaffleId) ??
    visibleRaffles[0]

  const canEnterQuery = useCanEnter(selectedRaffle?.id ?? null, address)
  const { writeContractAsync, isPending: isWritePending } = useWriteContract()
  const [txHash, setTxHash] = useState<Hex | undefined>()
  const [txIntent, setTxIntent] = useState<'enter' | 'finalize' | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const receiptQuery = useWaitForTransactionReceipt({
    chainId: STATUS_TESTNET_CHAIN_ID,
    hash: txHash,
    query: {
      enabled: Boolean(txHash),
    },
  })

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1_000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!visibleRaffles.length || selectedRaffleId) {
      return
    }

    setSelectedRaffleId(visibleRaffles[0].id)
  }, [selectedRaffleId, setSelectedRaffleId, visibleRaffles])

  useEffect(() => {
    if (!receiptQuery.isSuccess) {
      return
    }

    void queryClient.invalidateQueries({ queryKey: ['raffle-list'] })
    void queryClient.invalidateQueries({ queryKey: ['can-enter'] })
    void queryClient.invalidateQueries({ queryKey: ['tier-info'] })

    setTxHash(undefined)
    setTxIntent(null)
    setTxError(null)
  }, [queryClient, receiptQuery.isSuccess])

  useEffect(() => {
    if (!receiptQuery.isError) {
      return
    }

    setTxHash(undefined)
    setTxIntent(null)
    setTxError('트랜잭션에 실패했습니다. 다시 시도해주세요.')
  }, [receiptQuery.isError])

  async function handleEnter() {
    if (!selectedRaffle) {
      return
    }

    setTxError(null)
    setTxIntent('enter')

    try {
      const hash = await writeContractAsync({
        address: KARMA_RAFFLE_ADDRESS,
        abi: KARMA_RAFFLE_ABI,
        functionName: 'enter',
        args: [selectedRaffle.id],
      })
      setTxHash(hash)
    } catch {
      setTxIntent(null)
      setTxHash(undefined)
      setTxError('트랜잭션에 실패했습니다. 다시 시도해주세요.')
    }
  }

  async function handleFinalize() {
    if (!selectedRaffle) {
      return
    }

    setTxError(null)
    setTxIntent('finalize')

    try {
      const hash = await writeContractAsync({
        address: KARMA_RAFFLE_ADDRESS,
        abi: KARMA_RAFFLE_ABI,
        functionName: 'finalizeRaffle',
        args: [selectedRaffle.id],
      })
      setTxHash(hash)
    } catch {
      setTxIntent(null)
      setTxHash(undefined)
      setTxError('트랜잭션에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const isWrongChain = Boolean(isConnected && chainId !== STATUS_TESTNET_CHAIN_ID)
  const statusTone = selectedRaffle ? getRafflePhase(selectedRaffle, now) : 'upcoming'
  const statusLabel = selectedRaffle ? getRafflePhaseLabel(selectedRaffle, now) : '오픈 전'
  const eligibilityReason = formatEligibilityReason(canEnterQuery.data?.reason)
  const countdownLabel = selectedRaffle
    ? getRaffleCountdownLabel(selectedRaffle, now)
    : ''
  const showEnterButton =
    Boolean(selectedRaffle) &&
    statusTone !== 'drawn' &&
    statusTone !== 'canceled'
  const showFinalizeButton = Boolean(selectedRaffle) && statusTone === 'ready'
  const hasEntries = Boolean(selectedRaffle && Number(selectedRaffle.totalEntries) > 0)
  const isEnterButtonDisabled =
    !isConnected ||
    isWrongChain ||
    statusTone !== 'live' ||
    !canEnterQuery.data?.allowed ||
    isWritePending ||
    receiptQuery.isLoading
  const isFinalizeButtonDisabled =
    !isConnected ||
    isWrongChain ||
    !hasEntries ||
    isWritePending ||
    receiptQuery.isLoading

  return (
    <div className="screen-grid">
      <section className="screen-column">
        <div className="section-heading">
          <span className="section-kicker">Explore</span>
          <h2>지금 참여할 수 있는 래플</h2>
          <p>마음에 드는 상품을 고르고 바로 응모해보세요.</p>
        </div>

        <WalletStatusCard mode="user" />

        <article className="info-card info-card--soft">
          <div className="info-card__header">
            <h3>내 카르마</h3>
            <span className="status-pill status-pill--lavender">
              {address ? '확인됨' : '지갑 필요'}
            </span>
          </div>
          <div className="stat-grid">
            <div className="mini-stat">
              <span className="mini-stat__label">현재 티어</span>
              <strong>{tierInfoQuery.data?.tierId ?? '--'}</strong>
            </div>
            <div className="mini-stat">
              <span className="mini-stat__label">티어 라벨</span>
              <strong>{tierInfoQuery.data?.tierLabel ?? '--'}</strong>
            </div>
          </div>
        </article>

        <article className="info-card">
          <div className="info-card__header">
            <h3>래플 목록</h3>
            <span className="status-pill">{visibleRaffles.length}개</span>
          </div>

          {rafflesQuery.isLoading ? (
            <p className="empty-copy">래플을 불러오는 중이에요.</p>
          ) : null}

          {!rafflesQuery.isLoading && !visibleRaffles.length ? (
            <p className="empty-copy">지금 보여줄 래플이 없어요.</p>
          ) : null}

          <div className="raffle-list">
            {visibleRaffles.map((raffle) => (
              <button
                key={raffle.id.toString()}
                type="button"
                className={
                  selectedRaffle?.id === raffle.id
                    ? 'raffle-list__item is-selected'
                    : 'raffle-list__item'
                }
                onClick={() => setSelectedRaffleId(raffle.id)}
              >
                <div className="raffle-list__visual">
                  <RaffleArtwork raffle={raffle} className="raffle-list__image" />
                </div>

                <div className="raffle-list__body">
                  <div className="raffle-list__item-top">
                    <strong>{raffle.name}</strong>
                    <span className={`status-pill status-pill--${getRafflePhase(raffle, now)}`}>
                      {getRafflePhaseLabel(raffle, now)}
                    </span>
                  </div>

                  <p className="raffle-list__summary">{getRaffleSummary(raffle)}</p>

                  <div className="raffle-list__meta">
                    <span>
                      Tier {raffle.minTier} - {raffle.maxTier}
                    </span>
                    <span>{Number(raffle.totalEntries)}명 참여</span>
                    <span>{getRaffleCountdownLabel(raffle, now)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="screen-column">
        <div className="section-heading">
          <span className="section-kicker">Details</span>
          <h2>선택한 래플</h2>
          <p>일정과 조건을 확인하고 바로 참여할 수 있어요.</p>
        </div>

        {!selectedRaffle ? (
          <article className="detail-card">
            <p className="empty-copy">선택된 래플이 없어요.</p>
          </article>
        ) : (
          <article className="detail-card">
            <div className="detail-card__header">
              <div>
                <span className="section-kicker">
                  Round #{selectedRaffle.id.toString()}
                </span>
                <h3>{selectedRaffle.name}</h3>
              </div>
              <span className={`status-pill status-pill--${statusTone}`}>
                {statusLabel}
              </span>
            </div>

            <div className="detail-stack">
              <div className="detail-hero">
                <div className="detail-hero__visual">
                  <RaffleArtwork
                    raffle={selectedRaffle}
                    className="detail-hero__image"
                  />
                </div>

                {!selectedRaffle.drawn ? (
                  <div className="detail-hero__copy">
                    <p className="detail-hero__summary">
                      {getRaffleSummary(selectedRaffle)}
                    </p>

                    <div className="detail-chip-row">
                      <span className="detail-chip">
                        {Number(selectedRaffle.totalEntries)}명 참여
                      </span>
                      <span className="detail-chip">
                        Tier {selectedRaffle.minTier} - {selectedRaffle.maxTier}
                      </span>
                      <span className="detail-chip detail-chip--countdown">
                        {countdownLabel}
                      </span>
                      <span className="detail-chip">
                        운영자 {formatAddress(selectedRaffle.createdBy)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {selectedRaffle.drawn ? (
                <article className="nft-card nft-card--result">
                  <div className="info-card__header">
                    <h3>추첨 결과</h3>
                    <span className="status-pill status-pill--drawn">추첨 완료</span>
                  </div>

                  <div className="nft-card__body">
                    <div className="nft-card__visual">
                      <RaffleArtwork
                        raffle={selectedRaffle}
                        className="nft-card__image"
                      />
                    </div>

                    <div className="nft-card__copy">
                      <h4>{selectedRaffle.metadata?.name || selectedRaffle.name}</h4>
                      <div className="nft-card__meta">
                        <span>Winner {formatAddress(selectedRaffle.winner)}</span>
                        <span>Token #{selectedRaffle.winnerTokenId.toString()}</span>
                        <span>Entry #{selectedRaffle.winningEntryIndex.toString()}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ) : (
                <>
                  <div className="timeline-card">
                    <div>
                      <span className="mini-stat__label">시작</span>
                      <strong>{formatUnixTime(selectedRaffle.startTime)}</strong>
                    </div>
                    <div>
                      <span className="mini-stat__label">마감</span>
                      <strong>{formatUnixTime(selectedRaffle.endTime)}</strong>
                    </div>
                  </div>

                  <article className="info-card info-card--soft">
                    <div className="info-card__header">
                      <h3>내 참여 상태</h3>
                      <span className="status-pill status-pill--lavender">
                        {canEnterQuery.data?.allowed ? '참여 가능' : '확인 중'}
                      </span>
                    </div>

                    <div className="stat-grid">
                      <div className="mini-stat">
                        <span className="mini-stat__label">내 티어</span>
                        <strong>{canEnterQuery.data?.tierId ?? tierInfoQuery.data?.tierId ?? '--'}</strong>
                      </div>
                      <div className="mini-stat">
                        <span className="mini-stat__label">참여 여부</span>
                        <strong>{canEnterQuery.data?.allowed ? '가능' : '대기'}</strong>
                      </div>
                      <div className="mini-stat">
                        <span className="mini-stat__label">안내</span>
                        <strong>{eligibilityReason}</strong>
                      </div>
                      <div className="mini-stat">
                        <span className="mini-stat__label">응모 기록</span>
                        <strong>{canEnterQuery.data?.alreadyEntered ? '완료' : '없음'}</strong>
                      </div>
                    </div>
                  </article>

                  {(showEnterButton || showFinalizeButton) ? (
                    <div className="cta-row">
                      {showEnterButton ? (
                        <button
                          type="button"
                          className="primary-button"
                          disabled={isEnterButtonDisabled}
                          onClick={() => void handleEnter()}
                        >
                          {getEnterButtonLabel(statusTone)}
                        </button>
                      ) : null}

                      {showFinalizeButton ? (
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={isFinalizeButtonDisabled}
                          onClick={() => void handleFinalize()}
                        >
                          {hasEntries ? '당첨자 확정' : '참여자가 없어 추첨할 수 없습니다'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}

              {txError ? (
                <p className="validation-copy">{txError}</p>
              ) : null}

              {txHash ? (
                <p className="helper-copy">
                  최근 트랜잭션: {txIntent === 'enter' ? '응모' : '확정'} · {txHash}
                </p>
              ) : null}

              {isWritePending && !txHash ? (
                <p className="helper-copy">
                  지갑에서 트랜잭션을 확인하는 중입니다.
                </p>
              ) : null}

              {receiptQuery.isLoading && txHash ? (
                <p className="helper-copy">
                  트랜잭션 처리 중입니다. 블록에 반영될 때까지 잠시만 기다려주세요.
                </p>
              ) : null}

              {!selectedRaffle.drawn && !isConnected ? (
                <p className="helper-copy">
                  지갑을 연결하면 참여 여부를 확인하고 바로 응모할 수 있어요.
                </p>
              ) : null}
            </div>
          </article>
        )}
      </section>
    </div>
  )
}
