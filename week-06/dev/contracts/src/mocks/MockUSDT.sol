// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    // ERC20 부모 constructor에 토큰 이름과 심볼을 넘김
    constructor() ERC20("Mock USDT", "mUSDT") {}

    function decimals() public pure override returns (uint8) {
        // USDT는 보통 6 decimals를 쓰기 때문에,
        // 기본값 18 대신 6으로 override
        return 6;
    }

    function mint(address to, uint256 amount) external {
        // 테스트 편의를 위해 누구나 mint 가능
        _mint(to, amount);
    }
}
