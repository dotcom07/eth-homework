// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library RaffleTypes {
    struct Raffle {
        // 유저에게 보여줄 래플 이름
        string name;
        // 래플 상세 설명 URI이면서 당첨 NFT의 tokenURI로도 사용
        string metadataURI;
        // 어떤 operator가 이 래플을 만들었는지 기록
        address createdBy;
        // 참여 시작 시각
        uint64 startTime;
        // 참여 종료 시각
        uint64 endTime;
        // 참여 가능한 최소 카르마 티어
        uint8 minTier;
        // 참여 가능한 최대 카르마 티어
        uint8 maxTier;
        // 전체 참여 엔트리 수
        // 1지갑 1참여라 참가자 수와 같음
        uint256 totalEntries;
        // 추첨에서 당첨으로 선택된 엔트리의 index
        uint256 winningEntryIndex;
        // 당첨자에게 민팅된 NFT tokenId
        uint256 winnerTokenId;
        // 당첨자를 계산할 때 사용한 랜덤 hash
        bytes32 randomnessHash;
        // 최종 당첨자 주소
        address winner;
        // 운영자가 래플을 취소했는지 여부
        bool canceled;
        // 당첨자 선정까지 완료되었는지 여부
        bool drawn;
    }
}
