'use client';

import { formatUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';

import { bayTokenAbi } from '@/contracts/abi/BayToken';
import { starTokenAbi } from '@/contracts/abi/StarToken';
import { CONTRACT_ADDRESSES, sepoliaId } from '@/contracts/addresses';

export function TokenBalances() {
  // 현재 연결된 지갑 주소
  const { address, isConnected } = useAccount();

  // Sepolia에 배포한 토큰 주소
  const bayTokenAddress = CONTRACT_ADDRESSES[sepoliaId].bayToken;
  const starTokenAddress = CONTRACT_ADDRESSES[sepoliaId].starToken;

  // ============================================================
  // 1. BayToken 심볼 / 소수점 자리수 조회
  // ============================================================
  // ERC20은 보통 symbol(), decimals()를 제공합니다.
  // symbol: "BAY"
  // decimals: 18
  const { data: baySymbol } = useReadContract({
    address: bayTokenAddress,
    abi: bayTokenAbi,
    functionName: 'symbol',
    query: {
      enabled: isConnected,
    },
  });

  const { data: bayDecimals } = useReadContract({
    address: bayTokenAddress,
    abi: bayTokenAbi,
    functionName: 'decimals',
    query: {
      enabled: isConnected,
    },
  });

  // ============================================================
  // 2. BayToken 잔액 조회
  // ============================================================
  // balanceOf(address)는 해당 주소가 가진 토큰 잔액을 uint256으로 반환합니다.
  // 보통 bigint로 들어오므로 화면 표시 전에 formatUnits가 필요합니다.
  const {
    data: bayBalance,
    isLoading: isBayBalanceLoading,
    isError: isBayBalanceError,
  } = useReadContract({
    address: bayTokenAddress,
    abi: bayTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
    },
  });

  // ============================================================
  // 3. StarToken 심볼 / 소수점 자리수 조회
  // ============================================================
  const { data: starSymbol } = useReadContract({
    address: starTokenAddress,
    abi: starTokenAbi,
    functionName: 'symbol',
    query: {
      enabled: isConnected,
    },
  });

  const { data: starDecimals } = useReadContract({
    address: starTokenAddress,
    abi: starTokenAbi,
    functionName: 'decimals',
    query: {
      enabled: isConnected,
    },
  });

  // ============================================================
  // 4. StarToken 잔액 조회
  // ============================================================
  const {
    data: starBalance,
    isLoading: isStarBalanceLoading,
    isError: isStarBalanceError,
  } = useReadContract({
    address: starTokenAddress,
    abi: starTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
    },
  });

  // ============================================================
  // 5. 화면 표시용 문자열 변환
  // ============================================================
  // balanceOf는 원시 단위(bigint)를 반환합니다.
  // ERC20은 decimals가 보통 18이므로, formatUnits로 사람이 읽을 값으로 바꿉니다.
  const bayBalanceText =
    bayBalance !== undefined && bayDecimals !== undefined
      ? formatUnits(bayBalance, bayDecimals)
      : '0';

  const starBalanceText =
    starBalance !== undefined && starDecimals !== undefined
      ? formatUnits(starBalance, starDecimals)
      : '0';

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h2 className="text-xl font-semibold">My Tokens</h2>

      {!isConnected && (
        <p className="text-sm text-gray-600">
          지갑을 연결하면 배포한 토큰 잔액을 확인할 수 있습니다.
        </p>
      )}

      {isConnected && (
        <div className="space-y-3">
          <div className="rounded-md bg-gray-100 p-4">
            <p className="text-sm text-gray-500">BayToken</p>
            <p className="text-lg font-medium">
              {isBayBalanceLoading
                ? '불러오는 중...'
                : `${bayBalanceText} ${baySymbol ?? 'BAY'}`}
            </p>
            {isBayBalanceError && (
              <p className="text-sm text-red-600">
                BayToken 잔액을 읽는 중 에러가 발생했습니다.
              </p>
            )}
          </div>

          <div className="rounded-md bg-gray-100 p-4">
            <p className="text-sm text-gray-500">StarToken</p>
            <p className="text-lg font-medium">
              {isStarBalanceLoading
                ? '불러오는 중...'
                : `${starBalanceText} ${starSymbol ?? 'STAR'}`}
            </p>
            {isStarBalanceError && (
              <p className="text-sm text-red-600">
                StarToken 잔액을 읽는 중 에러가 발생했습니다.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
