// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { Tokens } from "../utils/Tokens.sol";
import { Addresses } from "../utils/Addresses.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { StrategyTriggerViewNoRevert } from "../../contracts/views/StrategyTriggerViewNoRevert.sol";

contract TestStrategyTriggerViewNoRevert is BaseTest, StrategyTriggerViewNoRevert {

     /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();
    }

    function test_isLimitOrderStrategy() public {
        assertTrue(isLimitOrderStrategy(51), "on mainnet, limit order should be 51");
    }

    function test_isDCAStrategy() public {
        assertTrue(isDCAStrategy(46), "on mainnet, dca should be 46");
    }

    function test_verifyRequiredAmountAndAllowance() public {
        address token = Addresses.USDC_ADDR;
        uint256 amount = uint256(5000);

        bytes32[] memory _subData = new bytes32[](4);
        _subData[0] = bytes32(uint256(uint160(token)));
        _subData[2] = bytes32(amount);

        // No balance, no allowance, trigger should be false
        assertEq(
            uint(verifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint(TriggerStatus.FALSE), "trigger status should be false"
        );

        // Give balance
        gibTokens(bob, token, amount);

        // Has balance, no allowance, trigger should be false
        assertEq(
            uint(verifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint(TriggerStatus.FALSE), "trigger status should be false"
        );

        // Give allowance
        approveAsSender(sender, token, walletAddr, amount);

        // Has balance, has allowance, trigger should be true
        assertEq(
            uint(verifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint(TriggerStatus.TRUE), "trigger status should be true"
        );
    }
}
