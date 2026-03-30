import { useQuery } from '@tanstack/react-query'
import { type Address, type Hex, zeroAddress } from 'viem'
import {
  KARMA_RAFFLE_ABI,
  KARMA_RAFFLE_ADDRESS,
} from '../../contracts/karmaRaffle'
import { publicClient } from '../../lib/viem/publicClient'

export type ContractMeta = {
  entryTierId: number
  minimumEligibleTierId: number
  nextRaffleId: bigint
}

export type CanEnterResult = {
  allowed: boolean
  reason: string
  tierId: number
  alreadyEntered: boolean
  totalCost: bigint
}

export type TierInfo = {
  tierId: number
  tierLabel: string
}

export type RafflePhase = 'canceled' | 'drawn' | 'upcoming' | 'ready' | 'live'

export type RaffleMetadataAttribute = {
  traitType: string
  value: string
}

export type RaffleMetadata = {
  name: string
  description: string
  imageURI: string
  imageUrl: string
  prizeLabel: string | null
  sourceFile: string | null
  attributes: RaffleMetadataAttribute[]
}

export type RaffleRecord = {
  id: bigint
  name: string
  metadataURI: string
  createdBy: Address
  startTime: bigint
  endTime: bigint
  minTier: number
  maxTier: number
  totalEntries: bigint
  winningEntryIndex: bigint
  winnerTokenId: bigint
  randomnessHash: Hex
  winner: Address
  canceled: boolean
  drawn: boolean
  metadata: RaffleMetadata | null
}

export function formatAddress(address: Address | string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatUnixTime(timestamp: bigint) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(Number(timestamp) * 1000)
}

export function toGatewayUrl(ipfsUri: string) {
  if (!ipfsUri.startsWith('ipfs://')) {
    return ipfsUri
  }

  return `https://gateway.pinata.cloud/ipfs/${ipfsUri.replace('ipfs://', '')}`
}

export function getRafflePhase(
  raffle: Pick<RaffleRecord, 'canceled' | 'drawn' | 'startTime' | 'endTime'>,
  now = Date.now(),
): RafflePhase {
  const nowInSeconds = Math.floor(now / 1000)
  const startTime = Number(raffle.startTime)
  const endTime = Number(raffle.endTime)

  if (raffle.canceled) {
    return 'canceled'
  }

  if (raffle.drawn) {
    return 'drawn'
  }

  if (nowInSeconds < startTime) {
    return 'upcoming'
  }

  if (nowInSeconds >= endTime) {
    return 'ready'
  }

  return 'live'
}

export function getRafflePhaseLabel(raffle: RaffleRecord, now = Date.now()) {
  const phase = getRafflePhase(raffle, now)

  switch (phase) {
    case 'canceled':
      return '취소됨'
    case 'drawn':
      return '추첨 완료'
    case 'upcoming':
      return '오픈 전'
    case 'ready':
      return '추첨 가능'
    case 'live':
      return '참여 중'
  }
}

export function formatEligibilityReason(reason?: string) {
  switch (reason) {
    case 'Contract paused':
      return '지금은 잠시 참여가 멈춰 있어요.'
    case 'Raffle canceled':
      return '취소된 래플이에요.'
    case 'Raffle already drawn':
      return '이미 당첨자가 확정된 래플이에요.'
    case 'Raffle not started':
      return '아직 오픈 전이에요.'
    case 'Raffle ended':
      return '응모가 마감됐어요.'
    case 'Tier not eligible':
      return '현재 카르마 티어로는 참여할 수 없어요.'
    case 'Already entered':
      return '이미 응모를 마쳤어요.'
    case 'Eligible':
      return '지금 바로 참여할 수 있어요.'
    default:
      return reason ?? '--'
  }
}

async function readRaffleMetadata(
  metadataURI: string,
): Promise<RaffleMetadata | null> {
  const gatewayUrl = toGatewayUrl(metadataURI)

  try {
    const response = await fetch(gatewayUrl)

    if (!response.ok) {
      return null
    }

    const contentType = response.headers.get('content-type') ?? ''

    if (!contentType.includes('json')) {
      return {
        name: '',
        description: '',
        imageURI: metadataURI,
        imageUrl: gatewayUrl,
        prizeLabel: null,
        sourceFile: null,
        attributes: [],
      } satisfies RaffleMetadata
    }

    const raw = (await response.json()) as {
      name?: unknown
      description?: unknown
      image?: unknown
      attributes?: Array<{
        trait_type?: unknown
        value?: unknown
      }>
    }

    const attributes = Array.isArray(raw.attributes)
      ? raw.attributes.flatMap((attribute) => {
          if (
            typeof attribute?.trait_type !== 'string' ||
            typeof attribute?.value !== 'string'
          ) {
            return []
          }

          return [
            {
              traitType: attribute.trait_type,
              value: attribute.value,
            },
          ] satisfies RaffleMetadataAttribute[]
        })
      : []

    const imageURI = typeof raw.image === 'string' ? raw.image : ''

    return {
      name: typeof raw.name === 'string' ? raw.name : '',
      description: typeof raw.description === 'string' ? raw.description : '',
      imageURI,
      imageUrl: imageURI ? toGatewayUrl(imageURI) : '',
      prizeLabel:
        attributes.find((attribute) => attribute.traitType === 'Prize')?.value ??
        null,
      sourceFile:
        attributes.find((attribute) => attribute.traitType === 'Source File')
          ?.value ?? null,
      attributes,
    } satisfies RaffleMetadata
  } catch {
    return null
  }
}

async function readContractMeta() {
  const [entryTierId, minimumEligibleTierId, nextRaffleId] = await Promise.all([
    publicClient.readContract({
      address: KARMA_RAFFLE_ADDRESS,
      abi: KARMA_RAFFLE_ABI,
      functionName: 'entryTierId',
    }),
    publicClient.readContract({
      address: KARMA_RAFFLE_ADDRESS,
      abi: KARMA_RAFFLE_ABI,
      functionName: 'minimumEligibleTierId',
    }),
    publicClient.readContract({
      address: KARMA_RAFFLE_ADDRESS,
      abi: KARMA_RAFFLE_ABI,
      functionName: 'nextRaffleId',
    }),
  ])

  return {
    entryTierId: Number(entryTierId),
    minimumEligibleTierId: Number(minimumEligibleTierId),
    nextRaffleId: nextRaffleId as bigint,
  } satisfies ContractMeta
}

async function readOwnerAddress() {
  return publicClient.readContract({
    address: KARMA_RAFFLE_ADDRESS,
    abi: KARMA_RAFFLE_ABI,
    functionName: 'owner',
  }) as Promise<Address>
}

async function readOperatorStatus(address: Address) {
  return publicClient.readContract({
    address: KARMA_RAFFLE_ADDRESS,
    abi: KARMA_RAFFLE_ABI,
    functionName: 'operators',
    args: [address],
  }) as Promise<boolean>
}

async function readTierInfo(address: Address) {
  const [tierId, tierLabel] = await Promise.all([
    publicClient.readContract({
      address: KARMA_RAFFLE_ADDRESS,
      abi: KARMA_RAFFLE_ABI,
      functionName: 'currentTier',
      args: [address],
    }),
    publicClient.readContract({
      address: KARMA_RAFFLE_ADDRESS,
      abi: KARMA_RAFFLE_ABI,
      functionName: 'currentTierLabel',
      args: [address],
    }),
  ])

  return {
    tierId: Number(tierId),
    tierLabel: tierLabel as string,
  } satisfies TierInfo
}

async function readCanEnter(raffleId: bigint, address: Address) {
  const result = await publicClient.readContract({
    address: KARMA_RAFFLE_ADDRESS,
    abi: KARMA_RAFFLE_ABI,
    functionName: 'canEnter',
    args: [raffleId, address],
  })

  const [allowed, reason, tierId, alreadyEntered, totalCost] =
    result as readonly [boolean, string, number, boolean, bigint]

  return {
    allowed,
    reason,
    tierId: Number(tierId),
    alreadyEntered,
    totalCost,
  } satisfies CanEnterResult
}

async function readRaffleList() {
  const nextRaffleId = (await publicClient.readContract({
    address: KARMA_RAFFLE_ADDRESS,
    abi: KARMA_RAFFLE_ABI,
    functionName: 'nextRaffleId',
  })) as bigint

  const raffleCount = Number(nextRaffleId - 1n)

  if (raffleCount <= 0) {
    return [] as RaffleRecord[]
  }

  const raffleIds = Array.from(
    { length: raffleCount },
    (_, index) => BigInt(raffleCount - index),
  )

  const raffles = await Promise.all(
    raffleIds.map((raffleId) =>
      publicClient.readContract({
        address: KARMA_RAFFLE_ADDRESS,
        abi: KARMA_RAFFLE_ABI,
        functionName: 'getRaffle',
        args: [raffleId],
      }),
    ),
  )

  const baseRaffles = raffleIds.map((raffleId, index) => {
    const raffle = raffles[index] as unknown as Omit<RaffleRecord, 'id'>

    return {
      id: raffleId,
      name: raffle.name,
      metadataURI: raffle.metadataURI,
      createdBy: raffle.createdBy,
      startTime: raffle.startTime,
      endTime: raffle.endTime,
      minTier: Number(raffle.minTier),
      maxTier: Number(raffle.maxTier),
      totalEntries: raffle.totalEntries,
      winningEntryIndex: raffle.winningEntryIndex,
      winnerTokenId: raffle.winnerTokenId,
      randomnessHash: raffle.randomnessHash,
      winner: raffle.winner ?? zeroAddress,
      canceled: raffle.canceled,
      drawn: raffle.drawn,
      metadata: null,
    } satisfies RaffleRecord
  })

  const metadataList = await Promise.all(
    baseRaffles.map((raffle) => readRaffleMetadata(raffle.metadataURI)),
  )

  return baseRaffles.map((raffle, index) => ({
    ...raffle,
    metadata: metadataList[index],
  }))
}

export function useContractMeta() {
  return useQuery({
    queryKey: ['raffle-contract-meta'],
    queryFn: readContractMeta,
  })
}

export function useOwnerAddress() {
  return useQuery({
    queryKey: ['raffle-owner'],
    queryFn: readOwnerAddress,
  })
}

export function useOperatorStatus(address?: Address) {
  return useQuery({
    queryKey: ['operator-status', address],
    queryFn: () => readOperatorStatus(address as Address),
    enabled: Boolean(address),
  })
}

export function useTierInfo(address?: Address) {
  return useQuery({
    queryKey: ['tier-info', address],
    queryFn: () => readTierInfo(address as Address),
    enabled: Boolean(address),
  })
}

export function useCanEnter(raffleId?: bigint | null, address?: Address) {
  return useQuery({
    queryKey: ['can-enter', raffleId?.toString(), address],
    queryFn: () => readCanEnter(raffleId as bigint, address as Address),
    enabled: Boolean(raffleId && address),
    refetchInterval: 15_000,
  })
}

export function useRaffleList() {
  return useQuery({
    queryKey: ['raffle-list'],
    queryFn: readRaffleList,
    refetchInterval: 15_000,
  })
}
