# Contracts

Status Network용 `Karma-gated free raffle` MVP 컨트랙트입니다.

- 모든 래플은 무료 참여
- 참여 기록은 온체인에 그대로 저장
- 당첨자는 해당 래플 전용 NFT를 받음
- 기간 종료 후 누구나 추첨 확정을 호출할 수 있음
- 카르마 티어 범위별로 참여 가능한 래플을 다르게 설정

## 핵심 아이디어

이 프로젝트는 "결제형 티켓 판매"보다 "커뮤니티 참여 기록 + 당첨 배지 NFT"에 더 가깝습니다.

그래서 현재 흐름은 이렇게 바뀌었습니다.

1. 운영자가 래플을 생성합니다.
2. 유저는 돈을 내지 않고 참여합니다.
3. 참여할 때 지갑 주소가 온체인에 기록됩니다.
4. 기간이 지나면 누군가 `finalizeRaffle()`을 호출합니다.
5. 컨트랙트가 그 시점의 랜덤 값을 이용해 당첨자를 계산합니다.
6. 당첨자에게 해당 래플 NFT를 바로 민팅합니다.

## 현재 래플 모델

`KarmaRaffle`는 각 래플마다 아래 정보를 저장합니다.

- `name`
- `metadataURI`
- `startTime`
- `endTime`
- `minTier`
- `maxTier`
- `totalEntries`
- `winningEntryIndex`
- `randomnessHash`
- `winner`
- `winnerTokenId`

중요한 점:

- `metadataURI`는 래플 설명용 메타데이터이면서 동시에 당첨 NFT의 `tokenURI`로도 사용됩니다.
- `minTier ~ maxTier` 범위 안에 들어오는 유저만 그 래플에 참여할 수 있습니다.
- 지금 버전은 `1지갑 1참여`라서 `entries[raffleId]` 배열에는 참가자 주소가 한 번씩만 쌓입니다.
- 그래서 `totalEntries`는 곧 전체 참가자 수와 같습니다.

## 폴더/파일 설명

### 루트

- `foundry.toml`
  - Foundry 설정 파일입니다.

- `README.md`
  - 지금 보고 있는 설명 문서입니다.

### `src/interfaces`

- `src/interfaces/IKarma.sol`
  - Status Network의 `Karma` 컨트랙트를 읽기 위한 인터페이스입니다.
  - `balanceOf(account)`를 통해 유저의 카르마 잔액을 읽습니다.

- `src/interfaces/IKarmaTiers.sol`
  - Status Network의 `KarmaTiers` 컨트랙트를 읽기 위한 인터페이스입니다.
  - 카르마 잔액으로 tier ID를 계산할 때 사용합니다.

### `src/config`

- `src/config/StatusTestnetConfig.sol`
  - Status testnet 관련 참고 주소와 상수를 담는 파일입니다.

### `src/access`

- `src/access/Ownable.sol`
  - owner 기반의 가장 단순한 권한 관리입니다.
  - owner는 operator를 관리합니다.

### `src/utils`

- `src/utils/Pausable.sol`
  - 긴급 상황에서 참여를 멈추기 위한 pause 기능입니다.

### `src/libraries`

- `src/libraries/RaffleTypes.sol`
  - 래플 구조체를 따로 분리한 파일입니다.

### `src/mocks`

- `src/mocks/MockUSDT.sol`
  - 예전 유료 래플 실험용으로 남겨둔 ERC20 mock입니다.
  - 현재 무료 래플 흐름에서는 사용하지 않습니다.

### 메인 컨트랙트

- `src/KarmaRaffle.sol`
  - 무료 참여 래플과 당첨 NFT 민팅을 담당하는 메인 컨트랙트입니다.
  - OpenZeppelin `ERC721`을 상속해 당첨 NFT를 발행합니다.

### 배포 스크립트

- `script/DeployKarmaRaffle.s.sol`
  - Foundry `forge script`로 `KarmaRaffle`를 배포합니다.
  - 기본값으로 `StatusTestnetConfig`의 `KARMA`, `KARMA_TIERS`를 사용합니다.
  - 필요하면 env로 `KARMA_ADDRESS`, `KARMA_TIERS_ADDRESS`, `ENTRY_TIER_ID`, `INITIAL_OPERATOR`, `TRANSFER_OWNERSHIP_TO`를 덮어쓸 수 있습니다.

## 주요 함수

- `createRaffle`
  - 운영자가 새 래플을 생성합니다.
  - `minTier`, `maxTier`로 참여 가능한 카르마 범위를 지정합니다.
  - 지금 버전은 `tier 0`부터 전부 열 수 있습니다.

- `enter`
  - 유저가 무료로 래플에 참여합니다.
  - 한 지갑은 한 번만 참여할 수 있습니다.
  - 참여한 주소는 엔트리 배열에 한 번만 기록됩니다.

- `finalizeRaffle`
  - 기간 종료 후 누구나 호출할 수 있습니다.
  - 호출 시점의 랜덤 값으로 당첨자를 계산하고 NFT를 민팅합니다.

- `canEnter`
  - 프론트엔드에서 미리 참여 가능 여부를 확인할 때 쓰기 좋습니다.
  - 이미 참여했는지도 같이 확인할 수 있습니다.
  - 무료 래플이므로 `totalCost`는 항상 `0`입니다.

- `currentTier`, `currentTierLabel`, `tierLabelById`
  - 현재 유저의 티어 ID와 실제 `KarmaTiers` 라벨을 읽을 수 있습니다.
  - 라벨은 하드코딩하지 않고 Status의 온체인 `KarmaTiers`에서 직접 읽습니다.

- `getEntryAt`, `getEntryCount`, `getUserEntryCount`, `hasUserEntered`
  - 참여 기록을 온체인에서 직접 확인할 수 있게 해주는 조회 함수입니다.

## 자동 추첨을 어떻게 이해하면 될까

중요:

- 기간이 지나도 컨트랙트가 진짜로 스스로 실행되지는 않습니다.
- 그래서 "자동"은 `endTime` 이후 아무나 `finalizeRaffle()`을 한 번 호출하면 즉시 추첨이 끝나는 구조로 이해하면 됩니다.

- 현재 구현은 `block.prevrandao`, 직전 블록 해시, `raffleId` 등을 섞은 pseudo-random 값을 사용합니다.
- 학습용 MVP로는 괜찮지만, 큰 가치가 걸리면 더 강한 VRF/automation 구성이 필요합니다.

즉, 지금은 "기간 종료 후 누구나 추첨 완료를 트리거할 수 있는 구조"라고 보면 됩니다.

## 카르마별 참여 제한

기존의 "최소 티어 이상" 방식만으로는
"이 래플은 중간 티어만", "이 래플은 상위 티어만" 같은 운영이 애매할 수 있습니다.

그래서 지금은 각 래플마다:

- `minTier`
- `maxTier`

를 같이 저장해서 특정 티어 구간만 열 수 있게 했습니다.

예시:

- `0 ~ 1`: `none ~ entry` 포함 래플
- `2 ~ 2`: `newbie` 전용 래플
- `3 ~ 4`: `basic ~ active` 전용 래플
- `8 ~ 10`: 상위 카르마 유저 전용 래플

현재 Status testnet의 온체인 라벨은 아래 순서입니다.

- `0`: `none`
- `1`: `entry`
- `2`: `newbie`
- `3`: `basic`
- `4`: `active`
- `5`: `regular`
- `6`: `power`
- `7`: `pro`
- `8`: `high-throughput`
- `9`: `s-tier`
- `10`: `legendary`

## 당첨 NFT

당첨 NFT는 별도 컬렉션 컨트랙트를 따로 두지 않고,
`KarmaRaffle` 자체가 ERC721 컬렉션 역할도 같이 합니다.

현재 규칙:

- 래플 1개당 NFT 1개 민팅
- `tokenId == raffleId`
- winner에게 바로 민팅
- `metadataURI`가 그대로 NFT `tokenURI`

이 구조라서 프론트에서는
"래플 결과"와 "당첨 NFT"를 한 컨트랙트에서 함께 조회할 수 있습니다.

## 테스트

Foundry 테스트를 추가해 아래 시나리오를 검증합니다.

- 실 Status testnet `KarmaTiers` 라벨 로그 확인
- 무료 참여 시 온체인 기록 저장
- `tier 0` 범위 허용
- 카르마 티어 범위 제한
- 기간 종료 후 finalize 추첨
- 당첨 NFT 민팅
- 취소된 래플의 재참여 차단

실행:

```bash
forge test
```

실제 Status testnet 라벨을 로그로 확인하려면:

```bash
ENABLE_STATUS_FORK=true forge test --match-test testForkLogsLiveKarmaTierLabels -vv
```

## 배포

시뮬레이션:

```bash
forge script script/DeployKarmaRaffle.s.sol:DeployKarmaRaffle \
  --rpc-url status_testnet -vvvv
```

실제 브로드캐스트:

```bash
forge script script/DeployKarmaRaffle.s.sol:DeployKarmaRaffle \
  --rpc-url status_testnet \
  --broadcast -vvvv
```

현재 실배포 결과:

- 배포된 래플 주소: `0x30CA4E6FBaC119cE2fDf6FCd17769230A1e79F9F`
- 트랜잭션 해시: `0x8d74b0a029d2cccc15b58bbbf243cbc8f273f72cd2643e3b28ba8d34e73b8f0d`
- 체인 ID: `1660990954` (`status_testnet`)
- owner/operator 주소: `0x6D6cE367B34A42c28222Be2037FD44e12119705F`
- 연결된 Karma 주소: `0x7ec5Dc75D09fAbcD55e76077AFa5d4b77D112fde`
- 연결된 KarmaTiers 주소: `0xc7fCD786a161f42bDaF66E18a67C767C23cFd30C`
- entry tier: `1` (온체인 entry 라벨 티어)
- 최소 참여 가능 tier: `0`

사용하는 env 변수:

- `PRIVATE_KEY`
  - 브로드캐스트에 사용할 배포 키입니다.
- `DEPLOYER`
  - `PRIVATE_KEY` 없이 시뮬레이션만 할 때 쓸 수 있는 sender override입니다.
- `KARMA_ADDRESS`
  - 기본 `StatusTestnetConfig.KARMA` 대신 다른 Karma 주소를 쓰고 싶을 때 사용합니다.
- `KARMA_TIERS_ADDRESS`
  - 기본 `StatusTestnetConfig.KARMA_TIERS` 대신 다른 KarmaTiers 주소를 쓰고 싶을 때 사용합니다.
- `ENTRY_TIER_ID`
  - 기본 `StatusTestnetConfig.ENTRY_TIER_ID` 대신 다른 entry tier id를 쓰고 싶을 때 사용합니다.
- `INITIAL_OPERATOR`
  - 배포 직후 추가 operator를 1명 바로 등록하고 싶을 때 사용합니다.
- `TRANSFER_OWNERSHIP_TO`
  - 배포 직후 owner를 다른 주소로 넘기고 싶을 때 사용합니다.

## OpenZeppelin 사용 포인트

현재 프로젝트는 OpenZeppelin을 아래처럼 사용합니다.

- `KarmaRaffle.sol`
  - `@openzeppelin/contracts/token/ERC721/ERC721.sol`
- `MockUSDT.sol`
  - `@openzeppelin/contracts/token/ERC20/ERC20.sol`

즉, 이번 버전의 핵심 외부 의존성은 ERC20이 아니라 ERC721입니다.

## 실제 Status testnet에서 어떻게 쓸까

실제로는 아래 컨트랙트를 사용합니다.

- Status 공식 컨트랙트
  - `Karma`
  - `KarmaTiers`

- 우리 팀이 직접 배포할 것
  - `KarmaRaffle`

로컬 문서 기준 참고 주소:

- `Karma`: `0x7ec5Dc75D09fAbcD55e76077AFa5d4b77D112fde`
- `KarmaTiers`: `0xc7fCD786a161f42bDaF66E18a67C767C23cFd30C`

현재 constructor는 아래 3개를 받습니다.

1. `karma`
2. `karmaTiers`
3. `entryTierId`

즉, 더 이상 `paymentToken`이나 `treasury`가 필요하지 않고,
배포 시점에 `entryTierId`만 명시하면 constructor에서 tier 전체를 스캔하지 않아도 됩니다.

## 읽는 추천 순서

1. `src/interfaces/IKarma.sol`
2. `src/interfaces/IKarmaTiers.sol`
3. `src/libraries/RaffleTypes.sol`
4. `src/KarmaRaffle.sol`
5. `test/KarmaRaffle.t.sol`
