# Karma Raffle Frontend

## 목표

Status L2 위에서 동작하는 `fully onchain raffle` 웹앱을 만든다.

- 래플 생성, 참여 기록, 추첨, 당첨 NFT 민팅은 온체인
- 상품 이미지와 NFT 메타데이터는 IPFS
- MVP는 한 웹앱 안에서 `Operator` / `User` 2개 탭으로 제공

## 기술 스택

- `wagmi + viem`
  - 지갑 연결
  - 체인 상태 확인
  - 컨트랙트 read / write
- `TanStack Query`
  - 비동기 서버 상태
  - 온체인 read 캐시
  - refetch / invalidate
- `Zustand`
  - UI 전역 상태
  - 현재 탭
  - 모달 열림
  - 등록 draft
  - 업로드 진행 상태
  - 선택된 raffle

## 개발 전 디자인 패턴

프론트 개발은 아래 패턴을 기준으로 시작한다.

### 1. App Shell + Mode Tabs

- 앱 전체는 `AppShell` 하나가 감싼다
- 상단 탭은 단순 네비게이션이 아니라 `모드 전환`으로 본다
- `Operator`와 `User`는 같은 앱 안에 있지만 서로 다른 문맥이다
- 탭 이동 시 `disconnect()` 하는 이유도 이 모드 분리 원칙 때문이다

즉 구조는 이렇게 잡는다.

```text
AppShell
  -> TopTabBar
  -> ActiveModeScreen
     -> OperatorScreen | UserScreen
```

### 2. Feature Module + Container / Presentational

- 각 탭은 `feature` 단위로 자른다
- 데이터 읽기/쓰기와 상태 조합은 `container`
- 화면 렌더링은 `presentational component`

예시:

- `features/operator/containers/OperatorScreen.tsx`
  - 지갑 상태, operator 여부, 업로드 상태, write action 연결
- `features/operator/components/OperatorForm.tsx`
  - 입력 UI만 담당
- `features/user/containers/UserScreen.tsx`
  - raffle list, selected raffle, canEnter, finalize 상태 조합
- `features/user/components/RaffleCard.tsx`
  - 카드 UI만 담당

원칙:

- 화면 컴포넌트는 `wagmi` 훅과 `Query` 훅을 직접 잔뜩 호출하지 않는다
- 데이터 조합은 상위 container에서 끝내고 하위에는 props로 내려준다

### 3. Server State First

온체인 read 결과는 전부 `TanStack Query` 기준으로 다룬다.

- contract read 결과
- raffle list
- operator 여부
- tier 정보
- canEnter 결과

반대로 `Zustand`에는 서버 상태를 복사 저장하지 않는다.

Zustand에 들어갈 것:

- 현재 탭
- 선택된 raffle id
- 모달 열림 여부
- operator draft
- 업로드 진행 상태
- 업로드 preview

즉 기준은 이렇다.

- 진실의 원천이 체인 / 네트워크면 `Query`
- 진실의 원천이 현재 UI 상호작용이면 `Zustand`

### 4. Contract Adapter Pattern

컨트랙트 호출 정보는 화면에 흩뿌리지 않고 `adapter` 레이어로 감싼다.

예시:

- `contracts/karmaRaffle.ts`
  - 주소 / ABI / chainId
- `features/user/api/readRaffle.ts`
  - raffle read 조합
- `features/operator/api/writeCreateRaffle.ts`
  - create write 조합

원칙:

- 컴포넌트 안에서 ABI 조각을 직접 쓰지 않는다
- 컨트랙트 주소를 화면 파일 안에 하드코딩하지 않는다
- read / write는 feature 안의 hook 또는 api 함수에서 감싼다

### 5. IPFS Upload Service Pattern

IPFS 업로드는 UI 이벤트와 분리된 `service`처럼 다룬다.

흐름:

- 컴포넌트는 `file`만 넘긴다
- 업로드 service가 이미지 업로드를 수행한다
- service가 metadata JSON을 만든다
- service가 metadata 업로드까지 끝내고 `metadataURI`를 반환한다

즉 UI는 아래 결과만 받는다.

- `imageUri`
- `imageGatewayUrl`
- `metadataUri`
- `fileName`

이렇게 해야 operator 화면이 업로드 구현 세부사항에 덜 묶인다.

### 6. Command / Query Separation

조회와 실행을 분리한다.

- Query
  - `currentTier`
  - `currentTierLabel`
  - `getRaffle`
  - `canEnter`
- Command
  - `createRaffle`
  - `enter`
  - `finalizeRaffle`
  - `setOperator`는 현재 MVP 프론트 범위 밖

UI 규칙:

- read 데이터는 자동 refetch 가능
- write 액션은 버튼 클릭으로만 발생
- write 성공 후 관련 query만 invalidate

### 7. Draft Form Staging

Operator 등록 폼은 바로 onchain write 값이 아니라 `draft -> validation -> upload -> submit` 단계로 본다.

단계:

1. draft 입력
2. 로컬 검증
3. 이미지 업로드
4. 메타데이터 업로드
5. `metadataURI` 확정
6. `createRaffle()` 실행

이 패턴을 쓰면 업로드 실패와 온체인 실패를 분리해서 다룰 수 있다.

### 8. Master / Detail Pattern

User 화면은 `목록 + 상세` 구조로 간다.

- 왼쪽 또는 상단: raffle list
- 오른쪽 또는 하단: selected raffle detail

모바일에서는:

- 목록 먼저
- 선택 시 detail section이 아래에 이어서 열리거나 sheet처럼 열린다

이 패턴을 쓰면 MVP에서도 확장성이 좋다.

### 9. Design Token First

색, radius, shadow, spacing은 컴포넌트 안에 하드코딩하지 않고 토큰으로 둔다.

예시:

- `--color-bg: #FFFFFF`
- `--color-ink: #09101C`
- `--color-primary: #7140FD`
- `--color-primary-soft: #F8F5FF`
- `--color-accent-1: #FCC3AB`
- `--color-accent-2: #FBE1D7`

원칙:

- 버튼마다 다른 보라색을 직접 쓰지 않는다
- 카드마다 다른 radius를 즉흥적으로 만들지 않는다
- 토큰을 먼저 정하고 컴포넌트가 그 토큰을 소비하게 한다

### 10. 상태 중복 금지

아래 값은 중복 저장하지 않는다.

- 현재 tier를 Query에도 두고 Zustand에도 또 저장
- raffle 상세를 Query에도 두고 selected 객체를 store에 또 저장
- canEnter 결과를 local state에 또 복사

허용:

- `selectedRaffleId`
- `operator draft`
- `upload progress`

비허용:

- 체인에서 읽은 struct 전체 복제 저장

## 컴포넌트 규칙

- `components/layout`
  - 탭 바, 헤더, 섹션 래퍼, 공통 페이지 프레임
- `components/wallet`
  - 지갑 연결 버튼, 체인 배지, 주소 배지
- `components/raffle`
  - 공용 카드, 상태 배지, 티어 배지, CTA 버튼
- `features/operator`
  - operator 전용 조합 로직
- `features/user`
  - user 전용 조합 로직

규칙:

- 공용 가능성이 있으면 `components`
- operator/user 문맥에 강하게 묶이면 `features`
- 비동기 로직이면 `feature 내부 hook/api`
- 순수 helper면 `lib`

## MVP 구조

- 싱글 웹앱
- 상단에 `Operator` / `User` 2개 탭
- 라우팅 없이 탭 전환형 구조
- 탭을 옮기면 현재 지갑 연결은 끊는다
- 탭 전환 시 탭 전용 Zustand 상태도 같이 초기화한다

## 탭 전환 규칙

- `Operator -> User` 이동 시 `disconnect()`
- `User -> Operator` 이동 시 `disconnect()`
- 사용자는 옮긴 탭에서 다시 명시적으로 지갑 연결
- 이유
  - operator 권한 지갑이 사용자 화면에 남지 않게 하기 위함
  - 사용자 지갑이 operator 화면에 남아 혼동되지 않게 하기 위함
  - MVP에서 권한 문맥을 단순하게 분리하기 위함

## 온체인 연결 정보

- chainId: `1660990954`
- chain name: `status_testnet`
- raffle address: `0x30CA4E6FBaC119cE2fDf6FCd17769230A1e79F9F`
- frontend config file: [src/contracts/karmaRaffle.ts](/home/sp/eth-homework/week-06/dev/frontend/src/contracts/karmaRaffle.ts)

## 화면 1. Operator 탭

### 목적

허용된 operator가 래플을 등록하는 화면.

### 진입 조건

- 지갑 연결 필요
- Status testnet 연결 필요
- `operators(address)`가 `true`인 주소만 등록 UI 활성화

### 비허용 주소 상태

- 등록 폼 대신 안내 카드 노출
- 읽기 전용 정보만 표시
- 메시지 예시
  - `허용된 operator만 래플을 등록할 수 있습니다`

### 주요 기능

- 지갑 연결
- operator 여부 확인
- 상품 이미지 업로드
- 메타데이터 자동 생성
- 메타데이터 IPFS 업로드
- `metadataURI` 자동 주입
- `createRaffle()` 실행

### 업로드 UX

`/home/sp/eth-homework/week-06/dev/contracts/ipfs` 로직을 프론트로 옮긴다.

프론트에서 옮길 흐름:

- 이미지 선택
- 허용 확장자 검사
  - `.png`
  - `.jpg`
  - `.jpeg`
  - `.webp`
- 선택 즉시 Pinata에 이미지 업로드
- 업로드 결과로 아래 값 확보
  - `file_name`
  - `display_name`
  - `cid`
  - `image_uri`
  - `image_gateway_url`
- 그 결과를 바탕으로 메타데이터 JSON 자동 생성
- 생성한 메타데이터 JSON을 다시 Pinata에 업로드
- 최종 `metadata_uri`를 폼에 자동 반영

### 메타데이터 규칙

현재 `contracts/ipfs/json_upload.js` 기준 구조를 그대로 따른다.

```json
{
  "name": "Karma Raffle Winner - 상품명",
  "description": "Winner NFT for 상품명",
  "image": "ipfs://...",
  "attributes": [
    { "trait_type": "Prize", "value": "상품명" },
    { "trait_type": "Source File", "value": "파일명.jpg" }
  ]
}
```

### 등록 폼 필드

- raffle name
- prize image file
- generated metadata URI
- start time
- end time
- min tier
- max tier

### 등록 전 검증

- `entryTierId` / `minimumEligibleTierId` 읽기
- 현재 `minimumEligibleTierId == 0`인지 확인
- `startTime < endTime`인지 확인
- 이미지 / metadata 업로드 완료 여부 확인

### 등록 후 동작

- `createRaffle()` write
- 성공 시 생성된 raffle id 표시
- TanStack Query invalidate
- User 탭 목록도 다시 읽을 수 있게 캐시 갱신

## 화면 2. User 탭

### 목적

일반 사용자가 현재 래플을 탐색하고 참여하는 화면.

### 주요 기능

- 지갑 연결
- 현재 체인 확인
- 현재 카르마 티어 조회
- 현재 카르마 티어 라벨 조회
- 래플 목록 조회
- 래플 상세 보기
- 참여 가능 여부 조회
- `enter()` 실행
- 종료된 래플은 `finalizeRaffle()` 실행 가능 상태 노출
- 당첨 결과 / NFT 정보 확인

### 사용자 화면에서 보여줄 정보

- raffle name
- prize image
- metadata 기반 설명
- start / end 시간
- 참여 가능 tier 범위
- 현재 참가자 수
- 내 현재 tier
- 내 참여 가능 여부
- 이미 참여했는지 여부
- 당첨자 확정 여부

### 사용자 CTA 규칙

- 지갑 미연결
  - `지갑 연결` 버튼
- 잘못된 체인
  - `Status testnet으로 전환` 안내
- 참여 가능
  - `Enter Raffle`
- 참여 불가
  - `canEnter()`의 reason을 그대로 노출
- 종료 후 아직 추첨 전
  - `Finalize Raffle`

## 온체인 / 오프체인 경계

### 온체인

- raffle 생성
- 참여 기록
- 티어 검증
- 추첨
- 당첨 NFT 민팅

### 오프체인

- 이미지 업로드
- 메타데이터 JSON 생성
- 메타데이터 IPFS 업로드
- gateway 기반 이미지 렌더링

## Pinata 업로드 관련 결정

프론트로 업로드 로직을 옮기더라도 `운영용 admin JWT`를 브라우저에 그대로 넣으면 안 된다.

MVP 기준 권장 방향:

- operator 업로드 전용 제한 키 사용
- 가능하면 업로드 권한을 최소화한 토큰 사용
- 브라우저에는 읽기 전용 gateway 주소와 제한 업로드 키만 사용

즉, `operator만 업로드 가능`은 두 층으로 본다.

- UI 층
  - `operators(address)` 읽어서 operator에게만 업로드 폼 노출
- 인프라 층
  - 업로드용 Pinata 권한도 최소화

## 데이터 패칭 전략

### wagmi / viem read

- `owner()`
- `operators(address)`
- `entryTierId()`
- `minimumEligibleTierId()`
- `nextRaffleId()`
- `currentTier(address)`
- `currentTierLabel(address)`
- `getRaffle(raffleId)`
- `getEntryCount(raffleId)`
- `canEnter(raffleId, user)`
- `isWinner(raffleId, user)`
- `tokenURI(tokenId)`

### TanStack Query 캐시 키 예시

- `['wallet', address]`
- `['operator-status', address]`
- `['tier', address]`
- `['raffle-list']`
- `['raffle', raffleId]`
- `['can-enter', raffleId, address]`
- `['winner', raffleId]`

## Zustand 상태 초안

- `activeTab`
- `selectedRaffleId`
- `operatorDraft`
- `uploadQueue`
- `uploadPreview`
- `isWalletModalOpen`

## 폴더 구조 초안

```text
src/
  app/
    providers/
  components/
    layout/
    wallet/
    raffle/
  contracts/
    karmaRaffle.ts
  features/
    operator/
    user/
  lib/
    pinata/
    wagmi/
    viem/
  stores/
    uiStore.ts
    operatorDraftStore.ts
  types/
```

## 디자인 방향

- 배경: `#FFFFFF`
- 배너 / 강한 섹션: `#09101C`
- 메인 버튼: `#7140FD`
- 메인 버튼 텍스트: `#FFFFFF`
- 연한 보라 배경: `#F8F5FF`
- 연한 보라 위 텍스트: `#7140FD`
- 포인트 색 1: `#FCC3AB`
- 포인트 색 2: `#FBE1D7`

## UI 톤

- 깔끔한 정보 구조
- 과한 장식보다 의도적인 대비
- 운영자 화면은 `도구형`
- 사용자 화면은 `상품 탐색형`
- 두 탭은 같은 앱 안에 있지만 분위기는 분명히 다르게

## 구현 순서

1. wagmi / viem / Query / Zustand 기본 provider 구성
2. Status testnet chain 설정
3. contract config 사용 연결
4. 탭 전환 + disconnect 규칙 구현
5. User 탭 read 화면 구현
6. Operator 탭 권한 체크 구현
7. Pinata 이미지 업로드 구현
8. 메타데이터 자동 생성 / 업로드 구현
9. `createRaffle()` write 연결
10. `enter()` / `finalizeRaffle()` 연결
