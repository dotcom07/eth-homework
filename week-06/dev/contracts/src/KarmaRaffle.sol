// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "./access/Ownable.sol";
import {Pausable} from "./utils/Pausable.sol";
import {IKarma} from "./interfaces/IKarma.sol";
import {IKarmaTiers} from "./interfaces/IKarmaTiers.sol";
import {RaffleTypes} from "./libraries/RaffleTypes.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// 컨트랙트는 3가지 역할
// 1) Karma / KarmaTiers를 읽어서 참여 가능 여부를 판단
// 2) 무료 래플 참여 기록을 온체인에 저장
// 3) 당첨자에게 ERC721 NFT를 민팅

// 래플 관리 컨트랙트 + 당첨 NFT 컬렉션 역할
contract KarmaRaffle is Ownable, Pausable, ERC721 {
    // immutable은 constructor에서 딱 1번만 설정
    // 그 뒤에는 바뀌지 않는 값
    // 매번 storage에서 읽는 것보다 가스 측면에서도 유리할 수 있음
    IKarma public immutable karma;
    IKarmaTiers public immutable karmaTiers;
    //onchain entry 라벨이 몇 번인지 기록용임
    uint8 public immutable entryTierId;
    //지금 MVP는 0부터 모두 열어둘 거라서 최소 허용 티어를 0으로 고정함
    uint8 public immutable minimumEligibleTierId;

    // 래플 ID를 1부터 시작하면
    // "0번은 존재하지 않는 값"으로 다루기 쉬워짐
    uint256 public nextRaffleId = 1;

    // owner는 운영자 권한을 관리하고,
    // operator는 실제 래플 생성/추첨만 하도록 분리
    mapping(address => bool) public operators;
    // raffleId => 래플 상세 정보
    mapping(uint256 => RaffleTypes.Raffle) internal raffles;
    // raffleId => 참가자 배열
    // 1지갑 1참여 주소
    mapping(uint256 => address[]) internal entries;
    // 단일 참여 모델이므로 count 대신 bool이면 충분
    mapping(uint256 => mapping(address => bool)) public hasEntered;

    // 이벤트는 "로그"
    // 상태 변수에 저장되는 건 아니지만, 프론트나 인덱서가 읽어서
    // 어떤 일이 일어났는지 추적할 수 있음
    event OperatorSet(address indexed account, bool allowed);
    event RaffleCreated(
        uint256 indexed raffleId,
        string name,
        address indexed createdBy,
        string metadataURI,
        uint64 startTime,
        uint64 endTime,
        uint8 minTier,
        uint8 maxTier
    );
    event Entered(uint256 indexed raffleId, address indexed user, uint8 tierId);
    event RaffleCanceled(uint256 indexed raffleId);
    event WinnerDrawn(
        uint256 indexed raffleId,
        address indexed winner,
        uint256 indexed tokenId,
        uint256 winningEntryIndex,
        bytes32 randomnessHash
    );
    event WinnerNftMinted(
        uint256 indexed raffleId, address indexed winner, uint256 indexed tokenId, string metadataURI
    );

    modifier onlyOperator() {
        require(operators[msg.sender], "Only operator");
        _;
    }

    // constructor 인자가 2개 -> 3개로 바꿈
    // 세 번째 인자 _entryTierId는 onchain entry 라벨 기록용임
    constructor(address _karma, address _karmaTiers, uint8 _entryTierId)
        Ownable(msg.sender)
        ERC721("Karma Raffle Winner", "KARMAWIN")
    {
        // 의존 컨트랙트 필수
        require(_karma != address(0), "Karma is zero");
        require(_karmaTiers != address(0), "KarmaTiers is zero");
        // uint8 최대값은 255라서 255를 넣고 + 1 하면 overflow 위험이 있음
        // 그래서 255 미만만 허용하고 아래에서 minimumEligibleTierId = _entryTierId + 1 계산함
        require(_entryTierId < type(uint8).max, "Entry tier overflow");

        // 주소 캐시용
        karma = IKarma(_karma);
        karmaTiers = IKarmaTiers(_karmaTiers);

        // 배포 인자 주입값
        // constructor 스캔 제거용
        // 예전 로직은 여기서 KarmaTiers 전체를 돌면서 "entry" 문자열을 찾았음
        // 그 외부 호출들이 배포 create tx를 무겁게 만들어서 지금은 스크립트가 미리 정한 값을 씀
        entryTierId = _entryTierId;
        // 지금은 tier 0부터 전부 열어둘 거라서 하한을 0으로 둠
        // entryTierId는 라벨 조회용으로만 남기고 실제 참여 차단에는 쓰지 않음
        minimumEligibleTierId = 0;

        // 배포자 기본 operator
        operators[msg.sender] = true;
        emit OperatorSet(msg.sender, true);
    }

    function setOperator(address account, bool allowed) external onlyOwner {
        // owner 전용 관리용
        require(account != address(0), "Operator is zero");
        operators[account] = allowed;
        emit OperatorSet(account, allowed);
    }

    function pause() external onlyOwner {
        // 외부에서는 pause()를 호출하고,
        // 실제 paused = true 변경은 부모 컨트랙트의 _pause()가 맡음
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // operator 전용 생성
    function createRaffle(
        string calldata name,
        string calldata metadataURI,
        uint64 startTime,
        uint64 endTime,
        uint8 minTier,
        uint8 maxTier
    ) external onlyOperator returns (uint256 raffleId) {
        // 기본 입력 검증용
        require(bytes(name).length > 0, "Name empty");
        require(startTime < endTime, "Bad time range");
        require(minTier <= maxTier, "Bad tier range");
        // 지금은 tier 0부터 열어두므로 minTier 하한 차단 없음

        // ID 선할당 방식
        // 아직은 Round 번호를 초기화하는 함수는 없음!
        raffleId = nextRaffleId;
        nextRaffleId++;

        // storage 핸들
        RaffleTypes.Raffle storage raffle = raffles[raffleId];
        raffle.name = name;
        // 래플/NFT 공용 URI
        raffle.metadataURI = metadataURI;
        raffle.createdBy = msg.sender;
        raffle.startTime = startTime;
        raffle.endTime = endTime;
        raffle.minTier = minTier;
        raffle.maxTier = maxTier;

        emit RaffleCreated(raffleId, name, msg.sender, metadataURI, startTime, endTime, minTier, maxTier);
    }

    function cancelRaffle(uint256 raffleId) external onlyOperator {
        RaffleTypes.Raffle storage raffle = _getRaffleStorage(raffleId);

        // 중복 상태 변경 방지용
        require(!raffle.canceled, "Already canceled");
        require(!raffle.drawn, "Already drawn");

        raffle.canceled = true;

        emit RaffleCanceled(raffleId);
    }

    function enter(uint256 raffleId) external whenNotPaused {
        RaffleTypes.Raffle storage raffle = _getRaffleStorage(raffleId);

        // 참여 기본 검증용
        require(!raffle.canceled, "Canceled raffle");
        require(!raffle.drawn, "Already drawn");
        require(block.timestamp >= raffle.startTime, "Not started");
        require(block.timestamp < raffle.endTime, "Ended");
        require(!hasEntered[raffleId][msg.sender], "Already entered");

        // 실시간 tier 체크용
        uint8 tierId = _tierOf(msg.sender);
        require(_isTierEligible(raffle, tierId), "Tier not eligible");

        hasEntered[raffleId][msg.sender] = true;
        // 1지갑 1엔트리 모델
        raffle.totalEntries += 1;

        // 참가자 기록용
        entries[raffleId].push(msg.sender);

        emit Entered(raffleId, msg.sender, tierId);
    }

    function finalizeRaffle(uint256 raffleId) external {
        RaffleTypes.Raffle storage raffle = _getRaffleStorage(raffleId);

        // 종료 후 수동 확정 방식
        require(!raffle.canceled, "Canceled raffle");
        require(!raffle.drawn, "Already drawn");
        require(block.timestamp >= raffle.endTime, "Not ended");
        require(raffle.totalEntries > 0, "No entries");

        bytes32 randomnessHash = _buildRandomnessHash(raffleId);
        uint256 winningEntryIndex = uint256(randomnessHash) % entries[raffleId].length;

        // 인덱스 기반 추첨
        address winner = entries[raffleId][winningEntryIndex];
        // raffleId 매핑용
        uint256 tokenId = raffleId;

        raffle.drawn = true;
        raffle.winner = winner;
        raffle.winningEntryIndex = winningEntryIndex;
        raffle.randomnessHash = randomnessHash;
        raffle.winnerTokenId = tokenId;

        // ERC721 안전 민팅
        _safeMint(winner, tokenId);

        emit WinnerDrawn(raffleId, winner, tokenId, winningEntryIndex, randomnessHash);
        emit WinnerNftMinted(raffleId, winner, tokenId, raffle.metadataURI);
    }

    function currentTier(address user) public view returns (uint8 tierId) {
        // 프론트 조회용
        return _tierOf(user);
    }

    function currentTierLabel(address user) public view returns (string memory tierLabel) {
        // 프론트에서 숫자 tierId 대신 바로 사람이 읽는 라벨을 보여주기 위한 함수임
        return tierLabelById(_tierOf(user));
    }

    function tierLabelById(uint8 tierId) public view returns (string memory tierLabel) {
        // 실제 라벨 문자열은 로컬 상수가 아니라 KarmaTiers 온체인 데이터에서 읽음
        return karmaTiers.getTierById(tierId).name;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // ERC721URIStorage를 빼고도 tokenId == raffleId 관계를 이용하면 URI를 바로 돌려줄 수 있음
        // 당첨 NFT 메타데이터는 이미 raffles[tokenId].metadataURI에 저장돼 있어서 중복 저장이 필요 없음
        _requireMinted(tokenId);
        return raffles[tokenId].metadataURI;
    }

    function canEnter(uint256 raffleId, address user)
        external
        view
        returns (bool allowed, string memory reason, uint8 tierId, bool alreadyEntered, uint256 totalCost)
    {
        RaffleTypes.Raffle storage raffle = _getRaffleStorage(raffleId);

        // 무료 래플 기준값
        tierId = _tierOf(user);
        alreadyEntered = hasEntered[raffleId][user];
        totalCost = 0;

        // UX 확인용 헬퍼
        if (paused) {
            return (false, "Contract paused", tierId, alreadyEntered, totalCost);
        }

        if (raffle.canceled) {
            return (false, "Raffle canceled", tierId, alreadyEntered, totalCost);
        }

        if (raffle.drawn) {
            return (false, "Raffle already drawn", tierId, alreadyEntered, totalCost);
        }

        if (block.timestamp < raffle.startTime) {
            return (false, "Raffle not started", tierId, alreadyEntered, totalCost);
        }

        if (block.timestamp >= raffle.endTime) {
            return (false, "Raffle ended", tierId, alreadyEntered, totalCost);
        }

        if (!_isTierEligible(raffle, tierId)) {
            return (false, "Tier not eligible", tierId, alreadyEntered, totalCost);
        }

        if (alreadyEntered) {
            return (false, "Already entered", tierId, alreadyEntered, totalCost);
        }

        return (true, "Eligible", tierId, alreadyEntered, totalCost);
    }

    function getRaffle(uint256 raffleId) external view returns (RaffleTypes.Raffle memory) {
        // struct 복사 반환용
        RaffleTypes.Raffle storage raffle = _getRaffleStorage(raffleId);
        return raffle;
    }

    function getUserEntryCount(uint256 raffleId, address user) external view returns (uint32) {
        // 레거시 호환용
        _requireRaffleExists(raffleId);
        return hasEntered[raffleId][user] ? 1 : 0;
    }

    function hasUserEntered(uint256 raffleId, address user) external view returns (bool) {
        _requireRaffleExists(raffleId);
        return hasEntered[raffleId][user];
    }

    function getTotalEntries(uint256 raffleId) external view returns (uint256) {
        RaffleTypes.Raffle storage raffle = _getRaffleStorage(raffleId);
        return raffle.totalEntries;
    }

    function getEntryAt(uint256 raffleId, uint256 index) external view returns (address) {
        _requireRaffleExists(raffleId);
        return entries[raffleId][index];
    }

    function getEntryCount(uint256 raffleId) external view returns (uint256) {
        // 현재 totalEntries와 동일 의미
        _requireRaffleExists(raffleId);
        return entries[raffleId].length;
    }

    function isWinner(uint256 raffleId, address user) external view returns (bool) {
        RaffleTypes.Raffle storage raffle = _getRaffleStorage(raffleId);
        return raffle.drawn && raffle.winner == user;
    }

    function _tierOf(address user) internal view returns (uint8) {
        // 잔액 기반 tier 계산
        uint256 karmaBalance = karma.balanceOf(user);
        return karmaTiers.getTierIdByKarmaBalance(karmaBalance);
    }

    function _isTierEligible(RaffleTypes.Raffle storage raffle, uint8 tierId) internal view returns (bool) {
        // 구간형 tier 체크
        return tierId >= raffle.minTier && tierId <= raffle.maxTier;
    }

    function _buildRandomnessHash(uint256 raffleId) internal view returns (bytes32) {
        // MVP 랜덤 소스
        return keccak256(
            abi.encode(block.prevrandao, blockhash(block.number - 1), raffleId, entries[raffleId].length, address(this))
        );
    }

    function _getRaffleStorage(uint256 raffleId) internal view returns (RaffleTypes.Raffle storage raffle) {
        // 공통 storage 핸들
        _requireRaffleExists(raffleId);
        raffle = raffles[raffleId];
    }

    function _requireRaffleExists(uint256 raffleId) internal view {
        // 0번/미생성 방지용
        require(raffleId > 0 && raffleId < nextRaffleId, "Raffle missing");
    }
}
