# Karma Raffle

Status L2 testnet 위에서 동작하는 `Karma-gated free raffle` dApp입니다.
운영자는 티어별 래플을 만들고, 사용자는 자신의 Status Karma 티어에 맞는 래플에 무료로 응모할 수 있습니다.
마감 시간이 지나면 누구나 당첨자 확정을 호출할 수 있고, 당첨자에게는 해당 래플의 ERC721 NFT가 민팅됩니다.

![Karma Raffle 미리보기](./frontend/src/assets/hero.png)

## 프로젝트 개요

이 프로젝트는 단순한 "추첨 이벤트"보다 `커뮤니티 참여 기록 + 티어 기반 선별 + 당첨 NFT 배지`에 더 가까운 구조를 목표로 했습니다.

핵심 흐름은 다음과 같습니다.

1. 운영자가 래플 이름, 메타데이터 URI, 진행 시간, 참여 가능 티어 범위를 등록합니다.
2. 사용자는 지갑을 연결하고 자신의 Karma tier를 확인합니다.
3. 조건을 만족하면 무료로 응모하고, 참여 기록은 온체인에 저장됩니다.
4. 종료 시간이 지나면 누구나 `finalizeRaffle()`을 호출할 수 있습니다.
5. 컨트랙트가 당첨자를 계산하고, 우승자에게 NFT를 민팅합니다.

## 왜 Status L2 testnet을 선택했는가

조교 확인 기준으로 `Status L2 testnet` 구현도 인정된다고 해서, 이 프로젝트는 Sepolia 대신 Status 환경에 맞춰 구현했습니다.

Status를 선택한 이유는 두 가지입니다.

- 이 프로젝트는 "무료 참여"와 "낮은 진입장벽"이 중요한데, Status L2는 가스리스에 가까운 UX와 저비용 실험 환경을 고려하기 좋았습니다.
- Status에는 이미 온체인 `Karma` / `KarmaTiers` 시스템이 존재해서, 별도의 포인트 토큰이나 등급 시스템을 새로 만들지 않고도 실제 커뮤니티 평판을 활용한 티어 게이팅을 붙일 수 있었습니다.

즉, Status는 이 프로젝트의 핵심 컨셉인 `무료 참여 래플 + 커뮤니티 평판 기반 참여 제한`과 가장 잘 맞는 네트워크였습니다.

## 주요 기능

- 운영자 전용 래플 생성
- Status Karma tier 기반 참여 제한
- 1지갑 1회 무료 응모
- 온체인 참여 기록 저장
- 마감 후 누구나 당첨자 확정 가능
- 당첨자 ERC721 NFT 민팅
- Operator / User 모드 분리 UI
- 응모 가능 여부, 티어 라벨, 추첨 결과 표시

## 기술 스택

- Smart Contract
  - Solidity `0.8.24`
  - Foundry
  - OpenZeppelin ERC721
- Frontend
  - React 19 + Vite + TypeScript
  - wagmi
  - viem
  - TanStack Query
  - Zustand
- Asset / Metadata
  - IPFS
  - Pinata

## 배포 정보

- Network: `Status L2 testnet`
- Chain ID: `1660990954`
- RPC: `https://public.sepolia.rpc.status.network`
- KarmaRaffle: `0x30CA4E6FBaC119cE2fDf6FCd17769230A1e79F9F`
- Owner / Operator: `0x6D6cE367B34A42c28222Be2037FD44e12119705F`
- Karma: `0x7ec5Dc75D09fAbcD55e76077AFa5d4b77D112fde`
- KarmaTiers: `0xc7fCD786a161f42bDaF66E18a67C767C23cFd30C`
- Deploy Tx: `0x8d74b0a029d2cccc15b58bbbf243cbc8f273f72cd2643e3b28ba8d34e73b8f0d`

## 프로젝트 구조

```text
week-06/dev/
├── contracts/            # Foundry 기반 컨트랙트, 테스트, 배포 스크립트
│   ├── src/
│   ├── test/
│   └── script/
├── frontend/             # React + Vite 프론트엔드
└── README.md
```

## 실행 방법

### 1. 컨트랙트

```bash
cd contracts
# fresh clone에서 lib/가 비어 있으면 1회 실행
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge test
```

Status L2 testnet 배포 스크립트 예시:

```bash
cd contracts
forge script script/DeployKarmaRaffle.s.sol:DeployKarmaRaffle \
  --rpc-url status_testnet \
  --broadcast -vvvv
```

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

## 검증

로컬에서 아래 항목을 확인했습니다.

- `forge test` 통과 (`8 passed`)
- `npm run build` 성공

## 구현 포인트

- `KarmaRaffle` 컨트랙트는 Status의 `Karma` / `KarmaTiers`를 읽어 유저의 실시간 티어를 판별합니다.
- 래플 메타데이터 URI는 래플 설명과 당첨 NFT의 `tokenURI`로 함께 사용됩니다.
- 프론트엔드는 Operator / User 탭으로 나뉘어 있으며, 참여 가능 여부와 트랜잭션 상태를 사용자에게 바로 보여줍니다.
- 당첨 결과는 winner address, token id, winning entry index까지 화면에서 확인할 수 있습니다.
