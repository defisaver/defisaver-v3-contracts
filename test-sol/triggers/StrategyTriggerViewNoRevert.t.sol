// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { Addresses } from "../utils/Addresses.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { StrategyTriggerViewNoRevert } from "../../contracts/views/strategy/StrategyTriggerViewNoRevert.sol";

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
        forkMainnet("StrategyTriggerViewNoRevert");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();
    }

    function test_verifyRequiredAmountAndAllowance() public {
        address token = Addresses.USDC_ADDR;
        uint256 amount = uint256(5000);

        bytes32[] memory _subData = new bytes32[](4);
        _subData[0] = bytes32(uint256(uint160(token)));
        _subData[2] = bytes32(amount);

        // No balance, no allowance, trigger should be false
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );

        // Give balance
        gibTokens(bob, token, amount);

        // Has balance, no allowance, trigger should be false
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );

        // Give allowance
        approveAsSender(sender, token, walletAddr, amount);

        // Has balance, has allowance, trigger should be true
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be true"
        );
    }

    function test_verifyRequiredAmountAndAllowance_with_revert() public view {
        bytes32[] memory _subData = new bytes32[](0);

        // Empty subData should revert
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.REVERT),
            "trigger status should be revert"
        );

        bytes32[] memory _subData2 = new bytes32[](1);
        _subData2[0] = bytes32(uint256(uint160(address(0))));

        // Invalid token address should revert
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData2)),
            uint256(TriggerStatus.REVERT),
            "trigger status should be revert"
        );
    }

    function test_verifyAaveV3LeverageManagementConditions() public view {
        //vm.warp(1748518160);
        address walletWithEnoughDebt = 0xaB5a28B6Ca2D1E12FE5AcC7341352d5032b74438;
        assertEq(
            uint256(_verifyAaveV3MinDebtPosition(walletWithEnoughDebt)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be true"
        );

        address walletWithNotEnoughDebt = 0x486c0bE444b63898Cca811654709f7D9e036Dc4E;
        assertEq(
            uint256(_verifyAaveV3MinDebtPosition(walletWithNotEnoughDebt)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );
    }

    function test_verifySparkLeverageManagementConditions() public view {
        address walletWithEnoughDebt = 0xc0c790F61a1721B70F0D4b1Aa1133687Fa3fd900;
        assertEq(
            uint256(_verifySparkMinDebtPosition(walletWithEnoughDebt)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be true"
        );

        address walletWithNotEnoughDebt = 0xe384F9cba7e27Df646C3E636136E5af57EC359FC;
        assertEq(
            uint256(_verifySparkMinDebtPosition(walletWithNotEnoughDebt)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );
    }
}
