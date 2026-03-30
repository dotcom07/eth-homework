import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { type Hex } from 'viem'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { WalletStatusCard } from '../../components/wallet/WalletStatusCard'
import {
  useContractMeta,
  useOperatorStatus,
} from '../raffle/api'
import {
  KARMA_RAFFLE_ABI,
  KARMA_RAFFLE_ADDRESS,
  STATUS_TESTNET_CHAIN_ID,
} from '../../contracts/karmaRaffle'
import { useOperatorDraftStore } from '../../stores/operatorDraftStore'

function toUnixSeconds(dateTimeLocal: string) {
  return BigInt(Math.floor(new Date(dateTimeLocal).getTime() / 1000))
}

export function OperatorScreen() {
  const { address, chainId, isConnected } = useAccount()
  const queryClient = useQueryClient()
  const contractMetaQuery = useContractMeta()
  const operatorStatusQuery = useOperatorStatus(address)
  const draft = useOperatorDraftStore((state) => state.draft)
  const setDraftField = useOperatorDraftStore((state) => state.setDraftField)
  const resetDraft = useOperatorDraftStore((state) => state.resetDraft)
  const { writeContractAsync, isPending: isWritePending } = useWriteContract()
  const [txHash, setTxHash] = useState<Hex | undefined>()
  const [txError, setTxError] = useState<string | null>(null)
  const receiptQuery = useWaitForTransactionReceipt({
    chainId: STATUS_TESTNET_CHAIN_ID,
    hash: txHash,
    query: {
      enabled: Boolean(txHash),
    },
  })

  const isWrongChain = Boolean(isConnected && chainId !== STATUS_TESTNET_CHAIN_ID)
  const minTierNumber = Number.parseInt(draft.minTier, 10)
  const maxTierNumber = Number.parseInt(draft.maxTier, 10)
  const startTimeMs = Date.parse(draft.startAt)
  const endTimeMs = Date.parse(draft.endAt)

  let validationMessage = ''

  if (!draft.name.trim()) {
    validationMessage = '래플 이름을 입력해주세요.'
  } else if (!draft.metadataURI.trim()) {
    validationMessage = '메타데이터 주소를 입력해주세요.'
  } else if (Number.isNaN(startTimeMs) || Number.isNaN(endTimeMs)) {
    validationMessage = '시작 시간과 종료 시간을 확인해주세요.'
  } else if (startTimeMs >= endTimeMs) {
    validationMessage = '종료 시간은 시작 시간보다 늦어야 해요.'
  } else if (Number.isNaN(minTierNumber) || Number.isNaN(maxTierNumber)) {
    validationMessage = '티어 범위를 숫자로 입력해주세요.'
  } else if (minTierNumber > maxTierNumber) {
    validationMessage = '최소 티어는 최대 티어보다 클 수 없어요.'
  }

  const isSubmitDisabled =
    !isConnected ||
    isWrongChain ||
    !operatorStatusQuery.data ||
    Boolean(validationMessage) ||
    isWritePending ||
    receiptQuery.isLoading

  useEffect(() => {
    if (!receiptQuery.isSuccess) {
      return
    }

    void queryClient.invalidateQueries({ queryKey: ['raffle-list'] })
    setTxHash(undefined)
    setTxError(null)
    resetDraft()
  }, [queryClient, receiptQuery.isSuccess, resetDraft])

  useEffect(() => {
    if (!receiptQuery.isError) {
      return
    }

    setTxHash(undefined)
    setTxError('트랜잭션에 실패했습니다. 다시 시도해주세요.')
  }, [receiptQuery.isError])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitDisabled) {
      return
    }

    setTxError(null)

    try {
      const hash = await writeContractAsync({
        address: KARMA_RAFFLE_ADDRESS,
        abi: KARMA_RAFFLE_ABI,
        functionName: 'createRaffle',
        args: [
          draft.name.trim(),
          draft.metadataURI.trim(),
          toUnixSeconds(draft.startAt),
          toUnixSeconds(draft.endAt),
          minTierNumber,
          maxTierNumber,
        ],
      })

      setTxHash(hash)
    } catch {
      setTxHash(undefined)
      setTxError('트랜잭션에 실패했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <div className="screen-grid">
      <section className="screen-column">
        <div className="section-heading">
          <span className="section-kicker">Operator</span>
          <h2>운영자 전용 화면</h2>
          <p>권한이 있는 지갑으로 새 래플을 열고 일정을 관리할 수 있어요.</p>
        </div>

        <WalletStatusCard mode="operator" />

        <article className="info-card info-card--soft">
          <div className="info-card__header">
            <h3>현재 설정</h3>
            <span className="status-pill status-pill--lavender">실시간</span>
          </div>
          <div className="stat-grid">
            <div className="mini-stat">
              <span className="mini-stat__label">기준 티어</span>
              <strong>{contractMetaQuery.data?.entryTierId ?? '--'}</strong>
            </div>
            <div className="mini-stat">
              <span className="mini-stat__label">최소 참여 티어</span>
              <strong>{contractMetaQuery.data?.minimumEligibleTierId ?? '--'}</strong>
            </div>
            <div className="mini-stat">
              <span className="mini-stat__label">운영 권한</span>
              <strong>{operatorStatusQuery.data ? '허용됨' : '권한 없음'}</strong>
            </div>
          </div>
        </article>

        {!operatorStatusQuery.data ? (
          <article className="detail-card">
            <span className="section-kicker">Notice</span>
            <h3>이 지갑은 아직 운영 권한이 없어요</h3>
            <p className="helper-copy">
              등록된 운영 지갑으로 다시 연결하면 새 래플을 바로 만들 수 있어요.
            </p>
          </article>
        ) : null}
      </section>

      <section className="screen-column">
        <div className="section-heading">
          <span className="section-kicker">Create</span>
          <h2>새 래플 열기</h2>
          <p>상품 이름, 일정, 메타데이터 주소를 입력하면 바로 래플이 생성됩니다.</p>
        </div>

        <form className="detail-card form-card" onSubmit={handleSubmit}>
          <label className="field">
            <span>래플 이름</span>
            <input
              value={draft.name}
              onChange={(event) => setDraftField('name', event.target.value)}
              placeholder="봄맞이 스페셜 래플"
            />
          </label>

          <label className="field">
            <span>메타데이터 주소</span>
            <input
              value={draft.metadataURI}
              onChange={(event) =>
                setDraftField('metadataURI', event.target.value)
              }
              placeholder="ipfs://..."
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>시작 시간</span>
              <input
                type="datetime-local"
                value={draft.startAt}
                onChange={(event) => setDraftField('startAt', event.target.value)}
              />
            </label>

            <label className="field">
              <span>종료 시간</span>
              <input
                type="datetime-local"
                value={draft.endAt}
                onChange={(event) => setDraftField('endAt', event.target.value)}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>최소 티어</span>
              <input
                type="number"
                min="0"
                max="10"
                value={draft.minTier}
                onChange={(event) => setDraftField('minTier', event.target.value)}
              />
            </label>

            <label className="field">
              <span>최대 티어</span>
              <input
                type="number"
                min="0"
                max="10"
                value={draft.maxTier}
                onChange={(event) => setDraftField('maxTier', event.target.value)}
              />
            </label>
          </div>

          <div className="info-band">
            <strong>현재 참여 범위</strong>
            <p>
              지금은 tier 0부터 전체 오픈 상태라 원하는 구간으로 자유롭게 설정할 수 있어요.
            </p>
          </div>

          {validationMessage ? (
            <p className="validation-copy">{validationMessage}</p>
          ) : null}

          {txError ? (
            <p className="validation-copy">{txError}</p>
          ) : null}

          {txHash ? (
            <p className="helper-copy">최근 트랜잭션: {txHash}</p>
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

          <div className="cta-row">
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitDisabled}
            >
              래플 생성
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => resetDraft()}
            >
              초기화
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
