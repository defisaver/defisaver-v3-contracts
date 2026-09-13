// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FtDnmmSupply } from "../../../contracts/actions/ftdnmm/FtDnmmSupply.sol";
import { FtDnmmBorrow } from "../../../contracts/actions/ftdnmm/FtDnmmBorrow.sol";
import { FtDnmmTestBase } from "./FtDnmmTestBase.sol";
import { FtDnmmEncode } from "../../utils/encode/FtDnmmEncode.sol";

contract TestFtDnmmBorrow is FtDnmmTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FtDnmmBorrow cut;
    FtDnmmSupply supply;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        super.setUp();
        cut = new FtDnmmBorrow();
        supply = new FtDnmmSupply();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_borrow() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, true)) {
                logSkip(testPair.borrowAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            _setUpCollateral(testPair.supplyAsset, supplyAmountFor(testPair.supplyAsset));

            uint256 borrowAmount = borrowAmountFor(testPair.borrowAsset);
            uint256 walletBalanceBefore = balanceOf(testPair.borrowAsset, walletAddr);

            _borrow(address(cut), testPair.borrowAsset, borrowAmount, walletAddr);

            assertEq(
                balanceOf(testPair.borrowAsset, walletAddr), walletBalanceBefore + borrowAmount
            );
            assertGt(positionsManager.debtShares(walletAddr, testPair.borrowAsset), 0);

            vm.revertToState(snapshotId);
        }
    }

    function test_should_borrow_to_recipient() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();
            TestPair memory testPair = testPairs[i];

            if (!isPairUsable(testPair, true)) {
                logSkip(testPair.borrowAsset, "asset not usable on this chain");
                vm.revertToState(snapshotId);
                continue;
            }

            _setUpCollateral(testPair.supplyAsset, supplyAmountFor(testPair.supplyAsset));

            uint256 borrowAmount = borrowAmountFor(testPair.borrowAsset);
            uint256 aliceBalanceBefore = balanceOf(testPair.borrowAsset, alice);

            _borrow(address(cut), testPair.borrowAsset, borrowAmount, alice);

            assertEq(balanceOf(testPair.borrowAsset, alice), aliceBalanceBefore + borrowAmount);
            assertGt(positionsManager.debtShares(walletAddr, testPair.borrowAsset), 0);

            vm.revertToState(snapshotId);
        }
    }

    function testFuzz_encode_decode_inputs(uint256 _amount, address _to, address _asset)
        public
        view
    {
        FtDnmmBorrow.Params memory params =
            FtDnmmBorrow.Params({ asset: _asset, amount: _amount, to: _to });

        FtDnmmBorrow.Params memory decodedParams = cut.parseInputs(abi.encode(params));

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
}
