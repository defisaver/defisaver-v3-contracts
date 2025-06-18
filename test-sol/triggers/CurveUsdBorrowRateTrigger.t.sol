// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

import { CurveUsdBorrowRateTrigger } from "../../contracts/triggers/CurveUsdBorrowRateTrigger.sol";
import { BaseTest } from "../utils/BaseTest.sol";

contract TestCurveUsdBorrowRateTrigger is BaseTest {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    CurveUsdBorrowRateTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    address WSTETH_MARKET = 0x100dAa78fC509Db39Ef7D04DE0c1ABD299f4C6CE;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("CurveUsdBorrowRateTrigger");
        cut = new CurveUsdBorrowRateTrigger();
    }
    
    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function testWstethRateSub() public {
        uint256 rate = cut.calcBorrowRate(WSTETH_MARKET);

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

        assertTrue(cut.isTriggered(abi.encode(), abi.encode(subEqualOverFail)) == false);
        assertTrue(cut.isTriggered(abi.encode(), abi.encode(subEqualUnderFail)) == false);
        assertTrue(cut.isTriggered(abi.encode(), abi.encode(subOver)) == true);
        assertTrue(cut.isTriggered(abi.encode(), abi.encode(subOverFail)) == false);
        assertTrue(cut.isTriggered(abi.encode(), abi.encode(subUnder)) == true);
        assertTrue(cut.isTriggered(abi.encode(), abi.encode(subUnderFail)) == false);
    }
}