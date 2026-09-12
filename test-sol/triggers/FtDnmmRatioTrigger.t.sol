// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FtDnmmSupply } from "../../contracts/actions/ftdnmm/FtDnmmSupply.sol";
import { FtDnmmBorrow } from "../../contracts/actions/ftdnmm/FtDnmmBorrow.sol";
import { FtDnmmRatioTrigger } from "../../contracts/triggers/FtDnmmRatioTrigger.sol";
import { FtDnmmTestBase } from "../actions/ftdnmm/FtDnmmTestBase.sol";

contract TestFtDnmmRatioTrigger is FtDnmmTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FtDnmmRatioTrigger cut;
    FtDnmmSupply supply;
    FtDnmmBorrow borrow;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        super.setUp();
        cut = new FtDnmmRatioTrigger();
        supply = new FtDnmmSupply();
        borrow = new FtDnmmBorrow();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_trigger_states() public {
        (bool positionCreated, uint256 currRatio) = _createPositionAndGetRatio();
        if (!positionCreated) {
            logSkip(address(0), "no usable pair on this chain");
            return;
        }

        assertGt(currRatio, 1e18);

        // UNDER: triggers when subbed ratio is above current ratio
        assertTrue(
            _isTriggered(walletAddr, currRatio + 1, uint8(FtDnmmRatioTrigger.RatioState.UNDER))
        );
        assertFalse(
            _isTriggered(walletAddr, currRatio - 1, uint8(FtDnmmRatioTrigger.RatioState.UNDER))
        );

        // OVER: triggers when subbed ratio is below current ratio
        assertTrue(
            _isTriggered(walletAddr, currRatio - 1, uint8(FtDnmmRatioTrigger.RatioState.OVER))
        );
        assertFalse(
            _isTriggered(walletAddr, currRatio + 1, uint8(FtDnmmRatioTrigger.RatioState.OVER))
        );
    }

    function test_no_trigger_for_empty_account() public {
        assertFalse(_isTriggered(alice, 1e18, uint8(FtDnmmRatioTrigger.RatioState.UNDER)));
        assertFalse(_isTriggered(alice, 0, uint8(FtDnmmRatioTrigger.RatioState.OVER)));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _isTriggered(address _user, uint256 _ratio, uint8 _state) internal returns (bool) {
        FtDnmmRatioTrigger.SubParams memory subParams =
            FtDnmmRatioTrigger.SubParams({ user: _user, ratio: _ratio, state: _state });

        return cut.isTriggered("", abi.encode(subParams));
    }

    function _createPositionAndGetRatio() internal returns (bool, uint256) {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            TestPair memory testPair = testPairs[i];
            if (!isPairUsable(testPair, true)) continue;

            uint256 supplyAmount = supplyAmountFor(testPair.supplyAsset);

            give(testPair.supplyAsset, sender, supplyAmount);
            approveAsSender(sender, testPair.supplyAsset, walletAddr, supplyAmount);
            _supply(address(supply), testPair.supplyAsset, supplyAmount, sender);

            _borrow(
                address(borrow),
                testPair.borrowAsset,
                borrowAmountFor(testPair.borrowAsset),
                walletAddr
            );

            return (true, getRatio(walletAddr));
        }

        return (false, 0);
    }
}
