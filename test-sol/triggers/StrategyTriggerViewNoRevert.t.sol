// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { Tokens } from "../utils/Tokens.sol";
import { Addresses } from "../utils/Addresses.sol";
import { StrategyTriggerViewNoRevert } from "../../contracts/views/StrategyTriggerViewNoRevert.sol";

contract TestStrategyTriggerViewNoRevert is BaseTest, StrategyTriggerViewNoRevert {

    function setUp() public override {
        forkMainnetLatest();
    }

    function test_isLimitOrderStrategy() public {
        assertTrue(isLimitOrderStrategy(51), "on mainnet, limit order should be 51");
    }

    function test_verifyRequiredAmount() public {
        address testAddr = bob;

        bytes32[] memory _subData = new bytes32[](4);
        _subData[0] = bytes32(uint256(uint160(Addresses.USDC_ADDR)));
        _subData[2] = bytes32(uint256(5000));

        assertEq(uint(verifyRequiredAmount(testAddr, _subData)), uint(TriggerStatus.FALSE), "trigger status should be false");

        gibTokens(testAddr, Addresses.USDC_ADDR, uint256(5001));

        assertEq(uint(verifyRequiredAmount(testAddr, _subData)), uint(TriggerStatus.TRUE), "trigger status should be false");
    }

}
