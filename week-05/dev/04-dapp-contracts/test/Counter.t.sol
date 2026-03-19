// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";

contract CounterTest is Test {
    Counter public counter;

    function setUp() public {
        counter = new Counter();
        counter.setCount(0);
    }

    function test_Increment() public {
        counter.increment();
        assertEq(counter.count(), 1);
    }

    function testFuzz_SetNumber(uint256 x) public {
        counter.setCount(x);
        assertEq(counter.count(), x);
    }
}
