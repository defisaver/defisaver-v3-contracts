// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { IAaveV4Oracle } from "../../contracts/interfaces/protocols/aaveV4/IAaveV4Oracle.sol";
import { AaveV4TestBase } from "test-sol/actions/aaveV4/AaveV4TestBase.t.sol";
import {
    AaveV4QuotePriceRangeTrigger
} from "../../contracts/triggers/AaveV4QuotePriceRangeTrigger.sol";

contract TestAaveV4QuotePriceRangeTrigger is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4QuotePriceRangeTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        cut = new AaveV4QuotePriceRangeTrigger();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_TriggerOutsideRange_Below() public {
        // Price is 100. Range [110, 200]. curr < 110 -> True
        _baseTest(110, 200, true);
    }

    function test_TriggerOutsideRange_Above() public {
        // Price is 100. Range [50, 90]. curr > 90 -> True
        _baseTest(50, 90, true);
    }

    function test_DontTriggerInsideRange() public {
        // Price is 100. Range [50, 200]. 50 < 100 < 200 -> False
        _baseTest(50, 200, false);
    }

    function test_TriggerUnder_UpperZero() public {
        // Price is 100. Range [110, 0]. curr < 110 -> True
        _baseTest(110, 0, true);
    }

    function test_DontTriggerUnder_UpperZero() public {
        // Price is 100. Range [90, 0]. curr < 90 -> False
        _baseTest(90, 0, false);
    }

    function test_TriggerAbove_LowerZero() public {
        // Price is 100. Range [0, 90]. curr > 90 -> True
        _baseTest(0, 90, true);
    }

    function test_DontTriggerAbove_LowerZero() public {
        // Price is 100. Range [0, 110]. curr > 110 -> False
        _baseTest(0, 110, false);
    }

    function _baseTest(uint256 _lowerPct, uint256 _upperPct, bool _shouldTrigger) internal {
        for (uint256 i = 0; i < getTestPairs().length; i++) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory pair = getTestPairs()[i];

            IAaveV4Oracle oracle = IAaveV4Oracle(ISpoke(pair.spoke).ORACLE());

            uint256 collPrice = oracle.getReservePrice(pair.collReserveId);
            uint256 debtPrice = oracle.getReservePrice(pair.debtReserveId);

            uint256 currentPrice = collPrice * 1e8 / debtPrice;

            uint256 lowerPrice = currentPrice * _lowerPct / 100;
            // If _upperPct is 0, we want upperPrice to be 0.
            uint256 upperPrice = _upperPct == 0 ? 0 : (currentPrice * _upperPct / 100);

            bytes memory subData = abi.encode(
                pair.spoke, pair.collReserveId, pair.debtReserveId, lowerPrice, upperPrice
            );

            bool triggered = cut.isTriggered(bytes(""), subData);

            assertEq(triggered, _shouldTrigger);

            vm.revertToState(snapshotId);
        }
    }
}
