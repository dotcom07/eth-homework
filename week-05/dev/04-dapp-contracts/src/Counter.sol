// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Counter {
    uint256 public count;

    function setCount(uint256 newCount) public {
        count = newCount;
    }

    function increment() public {
        count++;
    }

    function decrement() public {
        require(count > 0, "underflow");
        count--;
    }
}