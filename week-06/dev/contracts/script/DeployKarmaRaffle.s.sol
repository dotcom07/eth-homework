// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {VmSafe} from "forge-std/Vm.sol";
import {KarmaRaffle} from "../src/KarmaRaffle.sol";
import {IKarmaTiers} from "../src/interfaces/IKarmaTiers.sol";
import {StatusTestnetConfig} from "../src/config/StatusTestnetConfig.sol";

contract DeployKarmaRaffle is Script {
    address internal constant DEFAULT_FOUNDRY_SENDER = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38;

    function run() external returns (KarmaRaffle raffle) {
        // PRIVATE_KEY 우선
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer = deployerPrivateKey == 0 ? vm.envOr("DEPLOYER", msg.sender) : vm.addr(deployerPrivateKey);

        address karma = vm.envOr("KARMA_ADDRESS", StatusTestnetConfig.KARMA);
        address karmaTiers = vm.envOr("KARMA_TIERS_ADDRESS", StatusTestnetConfig.KARMA_TIERS);
        // 이번 패치 이후 entry tier id는 여기서 정해서 constructor로 넘김
        // env가 없으면 Status testnet 기본값 1을 사용함
        uint256 entryTierIdRaw = vm.envOr("ENTRY_TIER_ID", uint256(StatusTestnetConfig.ENTRY_TIER_ID));
        address initialOperator = vm.envOr("INITIAL_OPERATOR", address(0));
        address transferOwnershipTo = vm.envOr("TRANSFER_OWNERSHIP_TO", address(0));
        // constructor 쪽과 같은 이유로 255는 막아둠
        require(entryTierIdRaw < type(uint8).max, "Bad ENTRY_TIER_ID");
        uint8 entryTierId = uint8(entryTierIdRaw);

        _validateDependency("KARMA_ADDRESS", karma);
        _validateDependency("KARMA_TIERS_ADDRESS", karmaTiers);
        // 스크립트 단계에서 "이 tier id가 정말 존재하나"를 먼저 확인함
        // 잘못된 값을 넣어도 배포 후 이상 동작보다 배포 전에 빠르게 실패하게 하려는 용도임
        _validateEntryTier(karmaTiers, entryTierId);

        console2.log("Deploying KarmaRaffle");
        console2.log("chainid", block.chainid);
        console2.log("deployer", deployer);
        console2.log("karma", karma);
        console2.log("karmaTiers", karmaTiers);
        console2.log("configuredEntryTierId", entryTierId);

        if (block.chainid != StatusTestnetConfig.CHAIN_ID) {
            console2.log("warning: current chain differs from Status testnet config");
        }

        // 기본 sender 방지용
        // PRIVATE_KEY가 비어 있는데 Foundry 기본 sender로 브로드캐스트되는 실수를 막는 가드임
        if (
            vm.isContext(VmSafe.ForgeContext.ScriptBroadcast) && deployerPrivateKey == 0
                && deployer == DEFAULT_FOUNDRY_SENDER
        ) {
            revert("Missing signer: fix PRIVATE_KEY or pass --sender");
        }

        if (deployerPrivateKey == 0) {
            vm.startBroadcast(deployer);
        } else {
            vm.startBroadcast(deployerPrivateKey);
        }

        // entryTierId는 onchain entry 라벨 기록용이고
        // 실제 참여 하한은 컨트랙트 내부에서 0으로 열어둠
        raffle = new KarmaRaffle(karma, karmaTiers, entryTierId);

        if (initialOperator != address(0) && initialOperator != deployer) {
            raffle.setOperator(initialOperator, true);
        }

        if (transferOwnershipTo != address(0) && transferOwnershipTo != deployer) {
            raffle.transferOwnership(transferOwnershipTo);
        }

        vm.stopBroadcast();

        console2.log("raffle", address(raffle));
        console2.log("entryTierId", raffle.entryTierId());
        console2.log("minimumEligibleTierId", raffle.minimumEligibleTierId());
        console2.log("entryTierLabel", raffle.tierLabelById(raffle.entryTierId()));
        console2.log("owner", raffle.owner());
    }

    function _validateDependency(string memory label, address dependency) internal view {
        require(dependency != address(0), "Dependency is zero");
        require(dependency.code.length > 0, "Dependency has no code");
        console2.log(label, dependency);
    }

    function _validateEntryTier(address karmaTiers, uint8 entryTierId) internal view {
        // 배포 전 sanity check
        // 여기서는 tier 이름이 비어 있지 않은지만 보고 "이 id가 살아있다"를 확인함
        IKarmaTiers.Tier memory tier = IKarmaTiers(karmaTiers).getTierById(entryTierId);
        require(bytes(tier.name).length > 0, "Entry tier missing");
        console2.log("configuredEntryTierLabel", tier.name);
    }
}
