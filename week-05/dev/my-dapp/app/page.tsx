import { WalletConnect } from '@/components/WalletConnect';
import { Counter } from '@/components/Counter';
// week05-RainbowKit: ETH 전송 UI를 메인 페이지에 연결하기 위해 import
import { SendETH } from '@/components/SendETH';
import { TokenBalances } from '@/components/TokenBalances';

// ============================================================
// 메인 페이지
// ============================================================
// 이 페이지는 서버 컴포넌트입니다.
// 클라이언트 전용 기능(지갑 연결 등)은 WalletConnect 컴포넌트에서 처리합니다.
export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Bay-17th dApp</h1>
          <p className="mt-2 text-sm text-gray-600">
            Wallet 연결, Counter 연동, ERC20 토큰 잔액 조회 예제
          </p>
        </div>

        <WalletConnect />
        {/* week05-RainbowKit: 지갑 연결 후 ETH 전송 과제를 바로 확인할 수 있도록 배치 */}
        <SendETH />
        <Counter />
        <TokenBalances />
      </div>
    </main>
  );
}
