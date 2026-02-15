// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { IAaveV4Oracle } from "../../contracts/interfaces/protocols/aaveV4/IAaveV4Oracle.sol";
import { AaveV4TestBase } from "test-sol/actions/aaveV4/AaveV4TestBase.t.sol";
import { AaveV4QuotePriceTrigger } from "../../contracts/triggers/AaveV4QuotePriceTrigger.sol";

contract TestAaveV4QuotePriceTrigger is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4QuotePriceTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        cut = new AaveV4QuotePriceTrigger();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_triggerPriceOver() public {
        bool shouldTrigger = true;
        bool isOver = true;
        _baseTest(isOver, shouldTrigger);
    }

    function test_triggerPriceUnder() public {
        bool shouldTrigger = true;
        bool isOver = false;
        _baseTest(isOver, shouldTrigger);
    }

    function test_dontTriggerPriceOver() public {
        bool shouldTrigger = false;
        bool isOver = true;
        _baseTest(isOver, shouldTrigger);
    }

    function test_dontTriggerPriceUnder() public {
        bool shouldTrigger = false;
        bool isOver = false;
        _baseTest(isOver, shouldTrigger);
    }

    function _baseTest(bool _isOver, bool _shouldTrigger) internal {
        for (uint256 i = 0; i < getTestPairs().length; i++) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory pair = getTestPairs()[i];

            IAaveV4Oracle oracle = IAaveV4Oracle(ISpoke(pair.spoke).ORACLE());

            uint256 collPrice = oracle.getReservePrice(pair.collReserveId);
            uint256 debtPrice = oracle.getReservePrice(pair.debtReserveId);

            uint256 currentPrice = collPrice * 1e8 / debtPrice;

            uint256 triggerPrice = _shouldTrigger
                ? _isOver ? currentPrice / 2 : currentPrice * 2
                : _isOver ? currentPrice * 2 : currentPrice / 2;

            bytes memory subData = abi.encode(
                pair.spoke,
                pair.collReserveId,
                pair.debtReserveId,
                triggerPrice,
                uint8(_isOver ? 0 : 1)
            );

            bool triggered = cut.isTriggered(bytes(""), subData);

            assertEq(triggered, _shouldTrigger);

            vm.revertToState(snapshotId);
        }
    }
}
