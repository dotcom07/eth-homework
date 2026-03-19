'use client';

// ============================================================
// WalletConnect 컴포넌트
// ============================================================
// RainbowKit의 ConnectButton과 wagmi의 useAccount를 활용하여
// 지갑 연결 UI를 제공합니다.

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';

export function WalletConnect() {
  // ============================================================
  // useAccount Hook
  // ============================================================
  // 연결된 지갑의 정보를 가져옵니다.
  // - address: 지갑 주소 (0x...)
  // - isConnected: 연결 상태 (boolean)
  // - isConnecting: 연결 중 상태 (boolean)
  // - isDisconnected: 연결 해제 상태 (boolean)
  const { address, isConnected } = useAccount();

  // ============================================================
  // useBalance Hook
  // ============================================================
  // 지갑의 ETH 잔액을 조회합니다.
  // - data: { formatted, symbol, decimals, value }
  // - isLoading: 로딩 상태
  // - isError: 에러 상태
  //
  // enabled 옵션: isConnected가 true일 때만 쿼리 실행
  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address: address,
    query: {
      enabled: isConnected,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* ============================================================
          RainbowKit의 ConnectButton
          ============================================================
          지갑 연결 UI를 자동으로 제공합니다:
          - 연결되지 않음: "Connect Wallet" 버튼
          - 연결됨: 주소, 잔액, 네트워크 표시 + 드롭다운 메뉴

          커스터마이징:
          - showBalance={false} : 잔액 숨기기
          - chainStatus="icon" : 체인을 아이콘으로만 표시
          - accountStatus="avatar" : 주소를 아바타로만 표시
          ============================================================ */}
      <ConnectButton />

      {/* ============================================================
          연결된 지갑 정보 표시
          ============================================================
          isConnected가 true일 때만 렌더링됩니다.
          이 섹션을 커스터마이징하여 원하는 정보를 표시하세요.
          ============================================================ */}
      {isConnected && (
        <div className="p-4 bg-gray-100 rounded space-y-2">
          <p className="font-medium">연결된 지갑</p>

          {/* 지갑 주소 */}
          <p className="text-sm text-gray-600">
            주소: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>

          {/* ETH 잔액 */}
          <p className="text-sm text-gray-600">
            잔액: {isBalanceLoading
              ? '로딩 중...'
              : `${balance?.formatted ?? '0'} ${balance?.symbol ?? 'ETH'}`
            }
          </p>
        </div>
      )}
    </div>
  );
}
