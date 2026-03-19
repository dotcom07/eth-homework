'use client';

// 지갑 연결 상태 확인용
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// 우리가 정리해둔 ABI / 주소 import
import { counterAbi } from '@/contracts/abi/Counter';
import { CONTRACT_ADDRESSES, sepoliaId } from '@/contracts/addresses';

export function Counter() {
  // 현재 연결된 지갑 정보
  // isConnected: 지갑 연결 여부
  const { isConnected } = useAccount();

  // Sepolia에 배포한 Counter 컨트랙트 주소
  const counterAddress = CONTRACT_ADDRESSES[sepoliaId].counter;

  // ============================================================
  // 1. count 값 읽기
  // ============================================================
  // useReadContract는 스마트 컨트랙트의 view/pure 함수를 호출할 때 사용합니다.
  // 여기서는 Counter의 count() 값을 읽습니다.
  const {
    data: count,
    isLoading: isCountLoading,
    isError: isCountError,
    refetch: refetchCount,
  } = useReadContract({
    address: counterAddress,
    abi: counterAbi,
    functionName: 'count',
    query: {
      // 지갑 연결 후에만 읽도록 제한
      // 꼭 필수는 아니지만, 과제 흐름상 연결 후 보여주는 게 자연스럽습니다.
      enabled: isConnected,
    },
  });

  // ============================================================
  // 2. increment / decrement 트랜잭션 보내기
  // ============================================================
  // useWriteContract는 상태를 변경하는 함수 호출에 사용합니다.
  // 예: increment(), decrement()
  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    isError: isWriteError,
    error: writeError,
  } = useWriteContract();

  // ============================================================
  // 3. 트랜잭션 영수증 대기
  // ============================================================
  // useWaitForTransactionReceipt는 트랜잭션이 블록에 포함됐는지 기다립니다.
  // hash가 생긴 뒤에만 동작합니다.
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isConfirmError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // ============================================================
  // 4. 버튼 클릭 핸들러
  // ============================================================
  // increment 트랜잭션 전송
  function handleIncrement() {
    writeContract({
      address: counterAddress,
      abi: counterAbi,
      functionName: 'increment',
    });
  }

  // decrement 트랜잭션 전송
  function handleDecrement() {
    writeContract({
      address: counterAddress,
      abi: counterAbi,
      functionName: 'decrement',
    });
  }

  // ============================================================
  // 5. count를 화면에 예쁘게 표시하기
  // ============================================================
  // wagmi/viem은 uint256을 bigint로 돌려주는 경우가 많습니다.
  // 그래서 문자열로 바꿔서 보여주는 습관이 안전합니다.
  const countText = count !== undefined ? count.toString() : '-';

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h2 className="text-xl font-semibold">Counter</h2>

      {/* 지갑이 연결되지 않은 경우 안내 */}
      {!isConnected && (
        <p className="text-sm text-gray-600">
          지갑을 먼저 연결하면 Counter 컨트랙트를 읽고 쓸 수 있습니다.
        </p>
      )}

      {/* 지갑 연결 후 count 표시 */}
      {isConnected && (
        <>
          <div className="rounded-md bg-gray-100 p-4">
            <p className="text-sm text-gray-500">현재 count</p>

            <p className="mt-1 text-3xl font-bold">
              {isCountLoading ? '불러오는 중...' : countText}
            </p>

            {isCountError && (
              <p className="mt-2 text-sm text-red-600">
                count 값을 읽는 중 에러가 발생했습니다.
              </p>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleIncrement}
              disabled={isWritePending || isConfirming}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              Increment
            </button>

            <button
              onClick={handleDecrement}
              disabled={isWritePending || isConfirming}
              className="rounded bg-gray-700 px-4 py-2 text-white disabled:opacity-50"
            >
              Decrement
            </button>

            {/* 수동 새로고침용 */}
            <button
              onClick={() => refetchCount()}
              className="rounded border px-4 py-2"
            >
              Refresh
            </button>
          </div>

          {/* 트랜잭션 상태 표시 */}
          <div className="space-y-1 text-sm">
            {isWritePending && (
              <p className="text-blue-600">
                지갑 승인 대기 중이거나 트랜잭션 전송 중입니다...
              </p>
            )}

            {hash && (
              <p className="break-all text-gray-600">
                tx hash: {hash}
              </p>
            )}

            {isConfirming && (
              <p className="text-orange-600">
                트랜잭션이 블록에 포함되는 중입니다...
              </p>
            )}

            {isConfirmed && (
              <p className="text-green-600">
                트랜잭션이 확인되었습니다.
              </p>
            )}

            {isWriteError && (
              <p className="text-red-600">
                트랜잭션 전송 실패: {writeError?.message}
              </p>
            )}

            {isConfirmError && (
              <p className="text-red-600">
                트랜잭션 확인 중 에러가 발생했습니다.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
