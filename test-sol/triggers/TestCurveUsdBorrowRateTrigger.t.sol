// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "../../contracts/triggers/CurveUsdBorrowRateTrigger.sol";


contract TestCurveUsdBorrowRateTrigger is DSTest {
    CurveUsdBorrowRateTrigger trigger;

    address WSTETH_MARKET = 0x100dAa78fC509Db39Ef7D04DE0c1ABD299f4C6CE;

    function setUp() public {
        trigger = new CurveUsdBorrowRateTrigger();
    }

    function testWstethRateSub() public {
        uint256 rate = trigger.calcBorrowRate(WSTETH_MARKET);

        CurveUsdBorrowRateTrigger.SubParams memory subEqualOverFail = CurveUsdBorrowRateTrigger.SubParams(
            WSTETH_MARKET,
            rate,
            uint8(CurveUsdBorrowRateTrigger.TargetRateState.OVER)
        );

        CurveUsdBorrowRateTrigger.SubParams memory subEqualUnderFail = CurveUsdBorrowRateTrigger.SubParams(
            WSTETH_MARKET,
            rate,
            uint8(CurveUsdBorrowRateTrigger.TargetRateState.UNDER)
        );

        CurveUsdBorrowRateTrigger.SubParams memory subOver = CurveUsdBorrowRateTrigger.SubParams(
            WSTETH_MARKET,
            rate - 1,
            uint8(CurveUsdBorrowRateTrigger.TargetRateState.OVER)
        );

        CurveUsdBorrowRateTrigger.SubParams memory subOverFail = CurveUsdBorrowRateTrigger.SubParams(
            WSTETH_MARKET,
            rate + 1,
            uint8(CurveUsdBorrowRateTrigger.TargetRateState.OVER)
        );

        CurveUsdBorrowRateTrigger.SubParams memory subUnder = CurveUsdBorrowRateTrigger.SubParams(
            WSTETH_MARKET,
            rate + 1,
            uint8(CurveUsdBorrowRateTrigger.TargetRateState.UNDER)
        );

        CurveUsdBorrowRateTrigger.SubParams memory subUnderFail = CurveUsdBorrowRateTrigger.SubParams(
            WSTETH_MARKET,
            rate - 1,
            uint8(CurveUsdBorrowRateTrigger.TargetRateState.UNDER)
        );

        assertTrue(trigger.isTriggered(abi.encode(), abi.encode(subEqualOverFail)) == false);
        assertTrue(trigger.isTriggered(abi.encode(), abi.encode(subEqualUnderFail)) == false);
        assertTrue(trigger.isTriggered(abi.encode(), abi.encode(subOver)) == true);
        assertTrue(trigger.isTriggered(abi.encode(), abi.encode(subOverFail)) == false);
        assertTrue(trigger.isTriggered(abi.encode(), abi.encode(subUnder)) == true);
        assertTrue(trigger.isTriggered(abi.encode(), abi.encode(subUnderFail)) == false);
    }
}