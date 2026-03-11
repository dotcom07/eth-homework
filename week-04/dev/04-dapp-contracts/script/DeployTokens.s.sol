// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/BayToken.sol";
import "../src/StarToken.sol";

contract DeployTokens is Script {
    function run() external {
        vm.startBroadcast();
        BayToken bay = new BayToken();
        StarToken star = new StarToken();
        console.log("BayToken:", address(bay));
        console.log("StarToken:", address(star));
        vm.stopBroadcast();
    }
}