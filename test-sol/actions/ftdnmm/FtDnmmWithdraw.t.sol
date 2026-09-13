// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FtDnmmSupply } from "../../../contracts/actions/ftdnmm/FtDnmmSupply.sol";
import { FtDnmmWithdraw } from "../../../contracts/actions/ftdnmm/FtDnmmWithdraw.sol";
import { FtDnmmTestBase } from "./FtDnmmTestBase.sol";
import { FtDnmmEncode } from "../../utils/encode/FtDnmmEncode.sol";

contract TestFtDnmmWithdraw is FtDnmmTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FtDnmmWithdraw cut;
    FtDnmmSupply supply;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        super.setUp();
        cut = new FtDnmmWithdraw();
        supply = new FtDnmmSupply();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_withdraw() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, false)) {
                logSkip(testPair.supplyAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 supplyAmount = supplyAmountFor(testPair.supplyAsset);
            uint256 withdrawAmount = supplyAmount / 2;

            _setUpCollateral(testPair.supplyAsset, supplyAmount);

            uint256 walletBalanceBefore = balanceOf(testPair.supplyAsset, walletAddr);

            _withdraw(testPair.supplyAsset, withdrawAmount, walletAddr);

            assertEq(
                collateralAvail(walletAddr, testPair.supplyAsset), supplyAmount - withdrawAmount
            );
            assertEq(
                balanceOf(testPair.supplyAsset, walletAddr), walletBalanceBefore + withdrawAmount
            );

            vm.revertToState(snapshotId);
        }
    }

    function test_should_withdraw_to_recipient() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, false)) {
                logSkip(testPair.supplyAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 supplyAmount = supplyAmountFor(testPair.supplyAsset);
            uint256 withdrawAmount = supplyAmount / 4;

            _setUpCollateral(testPair.supplyAsset, supplyAmount);

            uint256 aliceBalanceBefore = balanceOf(testPair.supplyAsset, alice);
            uint256 walletBalanceBefore = balanceOf(testPair.supplyAsset, walletAddr);

            _withdraw(testPair.supplyAsset, withdrawAmount, alice);

            assertEq(balanceOf(testPair.supplyAsset, alice), aliceBalanceBefore + withdrawAmount);
            assertEq(balanceOf(testPair.supplyAsset, walletAddr), walletBalanceBefore);

            vm.revertToState(snapshotId);
        }
    }

    function test_should_withdraw_maxUint256() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, false)) {
                logSkip(testPair.supplyAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 supplyAmount = supplyAmountFor(testPair.supplyAsset);

            _setUpCollateral(testPair.supplyAsset, supplyAmount);

            uint256 walletBalanceBefore = balanceOf(testPair.supplyAsset, walletAddr);

            _withdraw(testPair.supplyAsset, type(uint256).max, walletAddr);

            assertEq(collateralAvail(walletAddr, testPair.supplyAsset), 0);
            assertEq(
                balanceOf(testPair.supplyAsset, walletAddr), walletBalanceBefore + supplyAmount
            );

            vm.revertToState(snapshotId);
        }
    }

    function testFuzz_encode_decode_inputs(uint256 _amount, address _to, address _asset)
        public
        view
    {
        FtDnmmWithdraw.Params memory params =
            FtDnmmWithdraw.Params({ asset: _asset, amount: _amount, to: _to });

        FtDnmmWithdraw.Params memory decodedParams = cut.parseInputs(abi.encode(params));

        assertEq(decodedParams.asset, params.asset);
        assertEq(decodedParams.amount, params.amount);
        assertEq(decodedParams.to, params.to);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _setUpCollateral(address _asset, uint256 _amount) internal {
        give(_asset, sender, _amount);
        approveAsSender(sender, _asset, walletAddr, _amount);
        _supply(address(supply), _asset, _amount, sender);
    }

    function _withdraw(address _asset, uint256 _amount, address _to) internal {
        bytes memory paramsCallData = FtDnmmEncode.withdraw(_asset, _amount, _to);
        bytes memory _calldata = executeActionCalldata(paramsCallData, false);
        executeOnWallet(address(cut), _calldata);
    }
}
