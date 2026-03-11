import { WalletConnect } from '@/components/WalletConnect';
import { Counter } from '@/components/Counter';
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
        <Counter />
        <TokenBalances />
      </div>
    </main>
  );
}