// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4Payback } from "../../../contracts/actions/aaveV4/AaveV4Payback.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV4Payback is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4Payback cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV4Payback();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_payback_partial() public {
        bool isDirect = false;
        bool useMaxUint256 = false;
        _baseTest(isDirect, useMaxUint256);
    }

    function test_payback_full_direct() public {
        bool isDirect = true;
        bool useMaxUint256 = true;
        _baseTest(isDirect, useMaxUint256);
    }

    function _baseTest(bool _isDirect, bool _useMaxUint256) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];

            uint256 supplyAmountUsd = 500;
            uint256 borrowAmountUsd = 100;

            // Supply collateral
            if (!_executeAaveV4Supply(testPair, supplyAmountUsd, sender, wallet)) {
                console2.log("Failed to supply assets. Check caps and reserve/spoke status.");
                continue;
            }

            address underlying =
                ISpoke(testPair.spoke).getReserve(testPair.debtReserveId).underlying;
            uint256 borrowAmount = amountInUSDPrice(underlying, borrowAmountUsd);

            // Borrow debt
            if (!_executeAaveV4Borrow(
                    testPair.spoke, testPair.debtReserveId, borrowAmount, sender, wallet
                )) {
                console2.log("Failed to borrow assets. Check caps and reserve/spoke status.");
                continue;
            }

            _payback(
                testPair.spoke, testPair.debtReserveId, borrowAmount, _isDirect, _useMaxUint256
            );

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _payback(
        address _spoke,
        uint256 _reserveId,
        uint256 _borrowedAmount,
        bool _isDirect,
        bool _useMaxUint256
    ) internal {
        address underlying = ISpoke(_spoke).getReserve(_reserveId).underlying;
        uint256 userDebtBefore = ISpoke(_spoke).getUserTotalDebt(_reserveId, walletAddr);
        uint256 paybackAmount = _useMaxUint256 ? userDebtBefore : _borrowedAmount / 2;

        // Give tokens to sender (slightly more)
        uint256 topUpAmount = _borrowedAmount * 100 / 99;
        give(underlying, sender, topUpAmount);
        approveAsSender(sender, underlying, walletAddr, topUpAmount);

        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4PaybackEncode(
                _spoke,
                walletAddr,
                sender,
                _reserveId,
                _useMaxUint256 ? type(uint256).max : paybackAmount
            ),
            _isDirect
        );

        uint256 senderBalanceBefore = balanceOf(underlying, sender);

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 walletBalanceAfter = balanceOf(underlying, walletAddr);
        uint256 userDebtAfter = ISpoke(_spoke).getUserTotalDebt(_reserveId, walletAddr);
        uint256 senderBalanceAfter = balanceOf(underlying, sender);

        assertEq(walletBalanceAfter, 0);
        assertEq(senderBalanceAfter, senderBalanceBefore - paybackAmount);

        if (_useMaxUint256) {
            assertEq(userDebtAfter, 0);
        } else {
            assertApproxEqAbs(userDebtAfter, userDebtBefore - paybackAmount, 1);
        }
    }
}
