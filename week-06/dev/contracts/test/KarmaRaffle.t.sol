// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {KarmaRaffle} from "../src/KarmaRaffle.sol";
import {IKarma} from "../src/interfaces/IKarma.sol";
import {IKarmaTiers} from "../src/interfaces/IKarmaTiers.sol";
import {RaffleTypes} from "../src/libraries/RaffleTypes.sol";
import {StatusTestnetConfig} from "../src/config/StatusTestnetConfig.sol";

// 테스트에서는 실제 Status Karma 컨트랙트를 붙이지 않고,
// 우리가 원하는 값만 돌려주는 mock을 만들어서 시나리오를 쉽게 통제
contract MockKarma is IKarma {
    mapping(address => uint256) internal balances;

    function setBalance(address account, uint256 balance) external {
        // 테스트 중에 원하는 유저의 Karma 값을 자유롭게 바꾸기 위한 헬퍼
        balances[account] = balance;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function slashedAmountOf(address) external pure returns (uint256) {
        return 0;
    }
}

// mock은 "카르마 잔액이 어느 티어에 속하는가"만 단순하게 흉내
contract MockKarmaTiers is IKarmaTiers {
    mapping(uint8 => Tier) internal tiers;
    uint256 internal tierCount;

    function setTier(uint8 tierId, uint256 minKarma, uint256 maxKarma, string calldata name, uint32 txPerEpoch)
        external
    {
        // struct 리터럴 문법으로 Tier를 한 번에 넣을 수 있음
        tiers[tierId] = Tier({minKarma: minKarma, maxKarma: maxKarma, name: name, txPerEpoch: txPerEpoch});

        uint256 updatedCount = uint256(tierId) + 1;
        if (updatedCount > tierCount) {
            tierCount = updatedCount;
        }
    }

    function getTierIdByKarmaBalance(uint256 karmaBalance) external view returns (uint8) {
        // 실제 프로덕션 구현은 더 복잡할 수 있지만,
        // 테스트에서는 단순 for-loop만으로도 충분
        for (uint256 i = 0; i < tierCount; i++) {
            Tier memory tier = tiers[uint8(i)];
            if (karmaBalance >= tier.minKarma && karmaBalance <= tier.maxKarma) {
                return uint8(i);
            }
        }

        revert("Tier missing");
    }

    function getTierById(uint8 tierId) external view returns (Tier memory) {
        return tiers[tierId];
    }

    function getTierCount() external view returns (uint256) {
        return tierCount;
    }
}

// Test를 상속하면 vm, assertEq 같은 Foundry 테스트 도구를 바로 쓸 수 있음
contract KarmaRaffleTest is Test {
    KarmaRaffle internal raffle;
    MockKarma internal karma;
    MockKarmaTiers internal karmaTiers;

    address internal noneUser = makeAddr("none-user");
    address internal entryUser = makeAddr("entry-user");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal charlie = makeAddr("charlie");

    function setUp() public {
        // 테스트 격리용 초기화
        karma = new MockKarma();
        karmaTiers = new MockKarmaTiers();

        _seedStatusTierData();

        // 실체인 구간 모사값
        karma.setBalance(noneUser, 0);
        karma.setBalance(entryUser, 1e18);
        karma.setBalance(alice, 2e18);
        karma.setBalance(bob, 60e18);
        karma.setBalance(charlie, 600e18);

        // 테스트도 실제 배포 방식과 맞추려고 entryTierId를 직접 넣도록 바뀜
        raffle = new KarmaRaffle(address(karma), address(karmaTiers), StatusTestnetConfig.ENTRY_TIER_ID);
    }

    function testForkLogsLiveKarmaTierLabels() public {
        bool enabled = vm.envOr("ENABLE_STATUS_FORK", false);
        if (!enabled) {
            emit log("Set ENABLE_STATUS_FORK=true to log live Status Karma tiers.");
            return;
        }

        vm.createSelectFork("status_testnet");

        IKarmaTiers liveKarmaTiers = IKarmaTiers(StatusTestnetConfig.KARMA_TIERS);
        uint256 tierCount = liveKarmaTiers.getTierCount();

        emit log_named_uint("liveTierCount", tierCount);
        for (uint256 i = 0; i < tierCount; i++) {
            IKarmaTiers.Tier memory tier = liveKarmaTiers.getTierById(uint8(i));
            emit log_named_uint("tierId", i);
            emit log_named_string("tierName", tier.name);
            emit log_named_uint("minKarma", tier.minKarma);
            emit log_named_uint("maxKarma", tier.maxKarma);
            emit log_named_uint("txPerEpoch", uint256(tier.txPerEpoch));
        }
    }

    function testCurrentTierLabelReadsFromKarmaTiers() public view {
        // entry 라벨 id는 그대로 1이지만
        // 실제 참여 하한은 지금 0으로 열어둔 상태임
        assertEq(raffle.entryTierId(), StatusTestnetConfig.ENTRY_TIER_ID);
        assertEq(raffle.minimumEligibleTierId(), 0);

        assertEq(raffle.currentTier(noneUser), 0);
        assertEq(raffle.currentTierLabel(noneUser), "none");

        assertEq(raffle.currentTier(entryUser), 1);
        assertEq(raffle.currentTierLabel(entryUser), "entry");

        assertEq(raffle.currentTier(alice), 2);
        assertEq(raffle.currentTierLabel(alice), "newbie");

        assertEq(raffle.currentTier(bob), 3);
        assertEq(raffle.currentTierLabel(bob), "basic");

        assertEq(raffle.currentTier(charlie), 4);
        assertEq(raffle.currentTierLabel(charlie), "active");
    }

    function testCreateRaffleAllowsTierZeroRange() public {
        vm.warp(100);

        // 지금은 tier 0부터 열려 있으니 0~3 범위도 생성 가능해야 함
        uint256 raffleId = raffle.createRaffle("Open Raffle", "ipfs://tier-zero-open", 90, 200, 0, 3);

        RaffleTypes.Raffle memory raffleInfo = raffle.getRaffle(raffleId);
        assertEq(raffleInfo.minTier, 0);
        assertEq(raffleInfo.maxTier, 3);
    }

    function testTierZeroCanEnterWhenRaffleRangeIncludesIt() public {
        uint256 raffleId = _createRaffle(0, 4);

        // none tier도 범위에 포함되면 참여 가능해야 함
        (bool allowed, string memory reason, uint8 tierId, bool alreadyEntered,) = raffle.canEnter(raffleId, noneUser);
        assertTrue(allowed);
        assertEq(reason, "Eligible");
        assertEq(tierId, 0);
        assertFalse(alreadyEntered);

        vm.prank(noneUser);
        raffle.enter(raffleId);

        assertEq(raffle.getUserEntryCount(raffleId, noneUser), 1);
        assertTrue(raffle.hasUserEntered(raffleId, noneUser));
    }

    function testEnterFreeRaffleStoresOnchainParticipation() public {
        // 단일 참여 모델이라
        // 한 번 참여하면 hasEntered, totalEntries, entries 배열이 모두 1회 기준으로 맞아야 함
        uint256 raffleId = _createRaffle(2, 3);

        (bool allowedBefore,, uint8 tierIdBefore, bool alreadyEnteredBefore, uint256 totalCostBefore) =
            raffle.canEnter(raffleId, alice);
        assertTrue(allowedBefore);
        assertEq(tierIdBefore, 2);
        assertFalse(alreadyEnteredBefore);
        assertEq(totalCostBefore, 0);
        assertEq(raffle.currentTierLabel(alice), "newbie");

        vm.prank(alice);
        raffle.enter(raffleId);

        assertEq(raffle.getUserEntryCount(raffleId, alice), 1);
        assertTrue(raffle.hasUserEntered(raffleId, alice));
        assertEq(raffle.getTotalEntries(raffleId), 1);
        assertEq(raffle.getEntryCount(raffleId), 1);
        assertEq(raffle.getEntryAt(raffleId, 0), alice);

        (bool allowedAfter, string memory reasonAfter,, bool alreadyEnteredAfter, uint256 totalCostAfter) =
            raffle.canEnter(raffleId, alice);
        assertFalse(allowedAfter);
        assertEq(reasonAfter, "Already entered");
        assertTrue(alreadyEnteredAfter);
        assertEq(totalCostAfter, 0);

        vm.prank(alice);
        vm.expectRevert(bytes("Already entered"));
        raffle.enter(raffleId);
    }

    function testTierRangeBlocksIneligibleKarmaTier() public {
        // newbie인 alice는 basic~active 래플에 못 들어가고,
        // basic인 bob은 들어갈 수 있어야 함
        uint256 raffleId = _createRaffle(3, 4);

        (bool allowed, string memory reason,, bool alreadyEntered,) = raffle.canEnter(raffleId, alice);
        assertFalse(allowed);
        assertEq(reason, "Tier not eligible");
        assertFalse(alreadyEntered);

        vm.prank(alice);
        vm.expectRevert(bytes("Tier not eligible"));
        raffle.enter(raffleId);

        vm.prank(bob);
        raffle.enter(raffleId);

        assertEq(raffle.getUserEntryCount(raffleId, bob), 1);
        assertTrue(raffle.hasUserEntered(raffleId, bob));
    }

    function testFinalizeRaffleAfterEndPicksWinnerAndMintsNft() public {
        // 기간이 지난 뒤 누구나 finalize를 호출하면
        // 컨트랙트가 그 시점의 랜덤 값으로 우승자를 계산하는지 검증
        uint256 raffleId = _createRaffle(2, 4);

        vm.prank(alice);
        raffle.enter(raffleId);

        vm.prank(bob);
        raffle.enter(raffleId);

        vm.roll(10);
        vm.prevrandao(bytes32(uint256(777)));
        vm.warp(250);

        bytes32 expectedRandomnessHash = keccak256(
            abi.encode(bytes32(uint256(777)), blockhash(block.number - 1), raffleId, uint256(2), address(raffle))
        );
        uint256 expectedWinningIndex = uint256(expectedRandomnessHash) % 2;
        address expectedWinner = expectedWinningIndex == 0 ? alice : bob;

        vm.prank(charlie);
        raffle.finalizeRaffle(raffleId);

        assertTrue(raffle.isWinner(raffleId, expectedWinner));
        assertEq(raffle.ownerOf(raffleId), expectedWinner);
        assertEq(raffle.tokenURI(raffleId), "ipfs://raffle-1");

        RaffleTypes.Raffle memory raffleInfo = raffle.getRaffle(raffleId);
        assertTrue(raffleInfo.drawn);
        assertEq(raffleInfo.winner, expectedWinner);
        assertEq(raffleInfo.totalEntries, 2);
        assertEq(raffleInfo.winningEntryIndex, expectedWinningIndex);
        assertEq(raffleInfo.winnerTokenId, raffleId);
        assertEq(raffleInfo.randomnessHash, expectedRandomnessHash);
    }

    function testCanceledRaffleRejectsFurtherEntries() public {
        // 취소된 래플은 이후 참여가 막혀야 힘
        uint256 raffleId = _createRaffle(2, 4);

        raffle.cancelRaffle(raffleId);

        vm.prank(charlie);
        vm.expectRevert(bytes("Canceled raffle"));
        raffle.enter(raffleId);
    }

    function _seedStatusTierData() internal {
        karmaTiers.setTier(0, 0, 1e18 - 1, "none", 0);
        karmaTiers.setTier(1, 1e18, 1e18, "entry", 2);
        karmaTiers.setTier(2, 1e18 + 1, 50e18 - 1, "newbie", 6);
        karmaTiers.setTier(3, 50e18, 500e18 - 1, "basic", 16);
        karmaTiers.setTier(4, 500e18, 5_000e18 - 1, "active", 96);
        karmaTiers.setTier(5, 5_000e18, 20_000e18 - 1, "regular", 480);
        karmaTiers.setTier(6, 20_000e18, 100_000e18 - 1, "power", 960);
        karmaTiers.setTier(7, 100_000e18, 500_000e18 - 1, "pro", 10_080);
        karmaTiers.setTier(8, 500_000e18, 5_000_000e18 - 1, "high-throughput", 108_000);
        karmaTiers.setTier(9, 5_000_000e18, 10_000_000e18 - 1, "s-tier", 240_000);
        karmaTiers.setTier(10, 10_000_000e18, type(uint256).max, "legendary", 480_000);
    }

    function _createRaffle(uint8 minTier, uint8 maxTier) internal returns (uint256 raffleId) {
        // vm.warp는 블록 타임스탬프를 강제로 바꾸는 Foundry 치트코드
        // 시간 의존 로직(startTime, endTime)을 테스트할 때 자주 씀
        vm.warp(100);

        raffleId = raffle.createRaffle("Community Raffle", "ipfs://raffle-1", 90, 200, minTier, maxTier);
    }
}
