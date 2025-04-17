// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { Tokens } from "../utils/Tokens.sol";
import { StrategyTriggerViewNoRevert } from "../../contracts/views/StrategyTriggerViewNoRevert.sol";

contract TestStrategyTriggerViewNoRevert is BaseTest, StrategyTriggerViewNoRevert {

    address walletAddr;
    address sender;

    Tokens tokens;

    function setUp() public override {
        forkMainnetLatest();
        tokens = new Tokens();
        tokens.initTokenNamesIfNeeded();
    }

    function test_isLimitOrderStrategy() public {
        assertTrue(isLimitOrderStrategy(51), "on mainnet, limit order should be 51");
    }

    function test_verifyRequiredAmount() public {
        address testAddr = 0xBbbBBBf0c3925013e5DD6C26620678825d7AfEe7;

        bytes32[] memory _subData = new bytes32[](4);
        _subData[0] = bytes32(uint256(uint160(tokens.getTokenAddressFromName("USDC"))));
        _subData[2] = bytes32(uint256(5000));

        assertEq(uint(verifyRequiredAmount(testAddr, _subData)), uint(TriggerStatus.FALSE), "trigger status should be false");

        gibTokens(testAddr, tokens.getTokenAddressFromName("USDC"), uint256(5001));

        assertEq(uint(verifyRequiredAmount(testAddr, _subData)), uint(TriggerStatus.TRUE), "trigger status should be false");
    }

}
