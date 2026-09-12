// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FtDnmmSupply } from "../../../contracts/actions/ftdnmm/FtDnmmSupply.sol";
import { FtDnmmBorrow } from "../../../contracts/actions/ftdnmm/FtDnmmBorrow.sol";
import { FtDnmmPayback } from "../../../contracts/actions/ftdnmm/FtDnmmPayback.sol";
import { FtDnmmTestBase } from "./FtDnmmTestBase.sol";
import { FtDnmmEncode } from "../../utils/encode/FtDnmmEncode.sol";

contract TestFtDnmmPayback is FtDnmmTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FtDnmmPayback cut;
    FtDnmmSupply supply;
    FtDnmmBorrow borrow;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        super.setUp();
        cut = new FtDnmmPayback();
        supply = new FtDnmmSupply();
        borrow = new FtDnmmBorrow();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_payback() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, true)) {
                logSkip(testPair.borrowAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 borrowAmount = borrowAmountFor(testPair.borrowAsset);
            _setUpPosition(testPair, borrowAmount);

            uint256 paybackAmount = borrowAmount / 2;
            uint256 debtBefore = getCurrentDebt(walletAddr, testPair.borrowAsset);

            _payback(testPair.borrowAsset, paybackAmount, address(0));

            uint256 debtAfter = getCurrentDebt(walletAddr, testPair.borrowAsset);
            assertEq(debtBefore - debtAfter, paybackAmount);
            assertEq(balanceOf(testPair.borrowAsset, walletAddr), borrowAmount - paybackAmount);

            vm.revertToState(snapshotId);
        }
    }

    function test_should_payback_from_sender() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, true)) {
                logSkip(testPair.borrowAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 borrowAmount = borrowAmountFor(testPair.borrowAsset);
            _setUpPosition(testPair, borrowAmount);

            uint256 paybackAmount = borrowAmount / 4;

            give(testPair.borrowAsset, sender, paybackAmount);
            approveAsSender(sender, testPair.borrowAsset, walletAddr, paybackAmount);

            uint256 debtBefore = getCurrentDebt(walletAddr, testPair.borrowAsset);

            _payback(testPair.borrowAsset, paybackAmount, sender);

            assertEq(debtBefore - getCurrentDebt(walletAddr, testPair.borrowAsset), paybackAmount);

            vm.revertToState(snapshotId);
        }
    }

    function test_should_payback_maxUint256() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, true)) {
                logSkip(testPair.borrowAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 borrowAmount = borrowAmountFor(testPair.borrowAsset);
            _setUpPosition(testPair, borrowAmount);

            // Repay from sender with enough to cover principal plus accrued interest.
            // give() tops up sender from zero for both deal() and swap paths, unlike
            // topping up the wallet, where deal() would overwrite the borrowed balance.
            uint256 senderFunds = borrowAmount + borrowAmount / 10 + 1;
            give(testPair.borrowAsset, sender, senderFunds);
            uint256 debt = getCurrentDebt(walletAddr, testPair.borrowAsset);
            // Approval for the debt must suffice even when max resolves to a larger balance.
            approveAsSender(sender, testPair.borrowAsset, walletAddr, debt);

            _payback(testPair.borrowAsset, type(uint256).max, sender);

            assertEq(positionsManager.debtShares(walletAddr, testPair.borrowAsset), 0);
            assertEq(balanceOf(testPair.borrowAsset, sender), senderFunds - debt);
            assertEq(balanceOf(testPair.borrowAsset, walletAddr), borrowAmount);

            vm.revertToState(snapshotId);
        }
    }

    function testFuzz_encode_decode_inputs(uint256 _amount, address _from, address _asset)
        public
        view
    {
        FtDnmmPayback.Params memory params =
            FtDnmmPayback.Params({ asset: _asset, amount: _amount, from: _from });

        FtDnmmPayback.Params memory decodedParams = cut.parseInputs(abi.encode(params));

        assertEq(decodedParams.asset, params.asset);
        assertEq(decodedParams.amount, params.amount);
        assertEq(decodedParams.from, params.from);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _setUpPosition(TestPair memory _testPair, uint256 _borrowAmount) internal {
        uint256 supplyAmount = supplyAmountFor(_testPair.supplyAsset);

        give(_testPair.supplyAsset, sender, supplyAmount);
        approveAsSender(sender, _testPair.supplyAsset, walletAddr, supplyAmount);
        _supply(address(supply), _testPair.supplyAsset, supplyAmount, sender);

        _borrow(address(borrow), _testPair.borrowAsset, _borrowAmount, walletAddr);
    }

    function _payback(address _asset, uint256 _amount, address _from) internal {
        bytes memory paramsCallData = FtDnmmEncode.payback(_asset, _amount, _from);
        bytes memory _calldata = executeActionCalldata(paramsCallData, false);
        executeOnWallet(address(cut), _calldata);
    }
}
