// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { MidnightView } from "../../contracts/views/MidnightView.sol";
import { Market } from "../../contracts/interfaces/protocols/midnight/IMidnight.sol";
import { console2 } from "forge-std/console2.sol";

contract TestMidnightView is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MidnightView cut;
    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    address TEST_USER = 0x2e3Cc8Cd22812eaa229CbE85f3de7c9a39A8f4f7;
    // cbBTC/USDC Aug 28th 2026.
    bytes32 MARKET_ID = 0x05959752fdeff325962b9d263edb421efc6e2186a49360dba6c32e86ebf6c84c;
    // Market that was never touched, so Midnight.toMarket reverts for it.
    bytes32 UNTOUCHED_MARKET_ID = keccak256("MidnightView.untouchedMarket");

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        if (!isBaseSelected()) {
            vm.skip(true, "MidnightView test is base only");
        }

        cut = new MidnightView();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_get_market_info() public view {
        MidnightView.MarketInfo memory marketInfo = cut.getMarketInfo(MARKET_ID);

        console2.log("Market info:");
        console2.log("id:", uint256(marketInfo.id));
        console2.log("totalUnits:", marketInfo.totalUnits);
        console2.log("lossFactor:", marketInfo.lossFactor);
        console2.log("withdrawable:", marketInfo.withdrawable);
        console2.log("continuousFeeCredit:", marketInfo.continuousFeeCredit);
        for (uint256 i = 0; i < marketInfo.settlementFees.length; i++) {
            console2.log("settlementFees[", i, "]:", marketInfo.settlementFees[i]);
        }
        console2.log("continuousFee:", marketInfo.continuousFee);
        console2.log("tickSpacing:", marketInfo.tickSpacing);
        for (uint256 i = 0; i < marketInfo.prices.length; i++) {
            console2.log("prices[", i, "]:", marketInfo.prices[i]);
        }
    }

    function test_get_position_info() public view {
        MidnightView.PositionInfo memory positionInfo = cut.getPositionInfo(MARKET_ID, TEST_USER);

        console2.log("Position info:");
        console2.log("credit:", positionInfo.credit);
        console2.log("pendingFee:", positionInfo.pendingFee);
        console2.log("debt:", positionInfo.debt);
        console2.log("collateralBitmap:", positionInfo.collateralBitmap);
        for (uint256 i = 0; i < positionInfo.collateral.length; i++) {
            console2.log("collateral[", i, "]:", positionInfo.collateral[i]);
        }
        console2.log("ratio:", positionInfo.ratio);
    }

    function test_get_ratio() public view {
        uint256 ratio = cut.getRatio(MARKET_ID, TEST_USER);

        console2.log("Ratio:", ratio);
    }

    function test_get_market_info_untouched_market() public {
        vm.expectRevert();
        cut.toMarket(UNTOUCHED_MARKET_ID);

        MidnightView.MarketInfo memory marketInfo = cut.getMarketInfo(UNTOUCHED_MARKET_ID);

        assertEq(marketInfo.id, UNTOUCHED_MARKET_ID);
        assertEq(marketInfo.tickSpacing, 0);
        assertEq(marketInfo.prices.length, 0);
    }

    function test_get_position_info_untouched_market() public {
        vm.expectRevert();
        cut.toMarket(UNTOUCHED_MARKET_ID);

        MidnightView.PositionInfo memory positionInfo =
            cut.getPositionInfo(UNTOUCHED_MARKET_ID, TEST_USER);

        assertEq(positionInfo.credit, 0);
        assertEq(positionInfo.pendingFee, 0);
        assertEq(positionInfo.debt, 0);
        assertEq(positionInfo.collateralBitmap, 0);
        assertEq(positionInfo.collateral.length, 0);
        assertEq(positionInfo.ratio, 0);
    }
}
