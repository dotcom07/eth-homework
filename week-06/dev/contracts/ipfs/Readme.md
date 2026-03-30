# IPFS Upload Guide

이 폴더는 상품 이미지를 Pinata에 업로드하고,
그 이미지를 참조하는 NFT 메타데이터 JSON까지 올린 뒤
최종 `metadataURI` 목록 파일을 만드는 용도입니다.

현재 gateway 기본값:

- `chocolate-elegant-otter-530.mypinata.cloud`

## 폴더 구성

- `img/`
  - 업로드할 상품 이미지 파일을 넣는 폴더

- `file_upload.js`
  - `img/` 안 이미지를 Pinata에 업로드
  - 결과를 `image_uris.json`으로 저장

- `json_upload.js`
  - `image_uris.json`을 읽어 메타데이터 JSON 생성
  - 메타데이터 JSON을 다시 Pinata에 업로드
  - 최종 `metadataURI` 목록 파일 생성

- `pinata_common.js`
  - Pinata SDK, `.env`, gateway, 공통 유틸 처리

- `out/`
  - 업로드 결과 파일이 저장되는 폴더

## 준비

작업 위치:

```bash
cd /home/sp/eth-homework/week-06/dev/contracts
```

`.env`에 아래 값이 있어야 합니다.

```env
PINATA_JWT=...
PINATA_GATEWAY=chocolate-elegant-otter-530.mypinata.cloud
```

`PINATA_GATEWAY`는 없어도 되지만,
없으면 코드 안 기본값으로 `chocolate-elegant-otter-530.mypinata.cloud`를 사용합니다.

패키지 설치:

```bash
npm install
```

## 사용 순서

### 1. 이미지 업로드

`ipfs/img/`에 상품 이미지를 넣고 아래를 실행합니다.

```bash
npm run ipfs:images
```

직접 실행도 가능합니다.

```bash
node ipfs/file_upload.js --image-dir ipfs/img --output ipfs/out/image_uris.json
```

생성 결과:

- `ipfs/out/image_uris.json`

이 파일에는 아래 값이 들어갑니다.

- `file_name`
- `display_name`
- `cid`
- `image_uri`
- `image_gateway_url`

### 2. 메타데이터 업로드

이미지 업로드가 끝났으면 아래를 실행합니다.

```bash
npm run ipfs:metadata
```

직접 실행도 가능합니다.

```bash
node ipfs/json_upload.js \
  --image-manifest ipfs/out/image_uris.json \
  --metadata-output ipfs/out/metadata_uris.json \
  --text-output ipfs/out/metadata_uris.txt
```

생성 결과:

- `ipfs/out/metadata_json/*.json`
- `ipfs/out/metadata_uris.json`
- `ipfs/out/metadata_uris.txt`

## 최종 결과 파일

### `ipfs/out/metadata_uris.txt`

가장 단순한 결과 파일입니다.

- 한 줄에 하나씩 `metadataURI`
- 컨트랙트에 바로 넣기 편함

예시:

```text
ipfs://bafk...
ipfs://bafk...
ipfs://bafk...
```

### `ipfs/out/metadata_uris.json`

조금 더 자세한 매니페스트입니다.

- 어떤 이미지 파일이 어떤 `metadataURI`로 연결되는지 확인 가능
- gateway URL도 함께 저장됨

주요 필드:

- `file_name`
- `display_name`
- `image_uri`
- `image_gateway_url`
- `metadata_cid`
- `metadata_uri`
- `metadata_gateway_url`
- `local_metadata_json`

## 컨트랙트에는 뭘 넣나

컨트랙트의 `metadataURI`에는 아래 값을 넣으면 됩니다.

- `ipfs/out/metadata_uris.txt`의 각 줄
- 또는 `ipfs/out/metadata_uris.json`의 `metadata_uri`

즉, 온체인에는 보통 `ipfs://...` 형태를 넣고,
브라우저에서 확인할 때만 `metadata_gateway_url`을 쓰면 됩니다.

## 메타데이터 JSON 예시

`json_upload.js`가 만드는 메타데이터는 대략 이런 구조입니다.

```json
{
  "name": "Karma Micro Raffle Winner - [스타벅스] 베이스볼 그립백",
  "description": "Winner NFT for [스타벅스] 베이스볼 그립백",
  "image": "ipfs://...",
  "attributes": [
    { "trait_type": "Prize", "value": "[스타벅스] 베이스볼 그립백" },
    { "trait_type": "Source File", "value": "[스타벅스] 베이스볼 그립백.jpg" }
  ]
}
```

## 참고

- 상품 이미지를 바꾸면 `npm run ipfs:images`부터 다시 실행해야 합니다.
- 메타데이터 설명이나 이름 형식을 바꾸고 싶으면 `json_upload.js`의 `buildMetadata()`를 수정하면 됩니다.
- 프론트에서 이미지를 띄울 때는 `image_gateway_url`이나 `metadata_gateway_url`을 쓰면 편합니다.
