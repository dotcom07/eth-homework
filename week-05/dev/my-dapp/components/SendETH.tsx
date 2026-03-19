'use client';

// week05-RainbowKit: ETH 전송 UI와 트랜잭션 상태 표시를 추가
import { useState } from 'react';
import { isAddress, parseEther } from 'viem';
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';

export function SendETH() {
  const { isConnected } = useAccount();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    sendTransaction,
    data: hash,
    isPending,
    error: sendError,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function handleSend() {
    setFormError(null);

    if (!isConnected) {
      setFormError('먼저 지갑을 연결해주세요.');
      return;
    }

    if (!isAddress(to)) {
      setFormError('올바른 받는 주소를 입력해주세요.');
      return;
    }

    try {
      const value = parseEther(amount);

      if (value <= BigInt(0)) {
        setFormError('0보다 큰 ETH 금액을 입력해주세요.');
        return;
      }

      sendTransaction({
        to,
        value,
      });
    } catch {
      setFormError('올바른 ETH 금액을 입력해주세요.');
    }
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h2 className="text-xl font-semibold">Send ETH</h2>

      <p className="text-sm text-gray-600">
        Sepolia 테스트넷에서 다른 주소로 ETH를 전송해보세요.
      </p>

      <input
        type="text"
        placeholder="받는 주소 (0x...)"
        value={to}
        onChange={(event) => setTo(event.target.value)}
        className="w-full rounded border p-3"
      />

      <input
        type="text"
        placeholder="금액 (ETH)"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        className="w-full rounded border p-3"
      />

      <button
        onClick={handleSend}
        disabled={isPending || isConfirming}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending
          ? '서명 대기 중...'
          : isConfirming
            ? '확인 중...'
            : '전송'}
      </button>

      <div className="space-y-1 text-sm">
        {formError && <p className="text-red-600">{formError}</p>}

        {sendError && (
          <p className="text-red-600">트랜잭션 전송 실패: {sendError.message}</p>
        )}

        {hash && (
          <p className="break-all text-gray-600">
            tx hash: {hash}
          </p>
        )}

        {isPending && (
          <p className="text-blue-600">지갑에서 트랜잭션 서명을 기다리는 중입니다...</p>
        )}

        {isConfirming && (
          <p className="text-orange-600">
            블록체인에서 트랜잭션을 확인하는 중입니다...
          </p>
        )}

        {isSuccess && (
          <p className="text-green-600">트랜잭션이 성공적으로 완료되었습니다.</p>
        )}
      </div>
    </div>
  );
}
