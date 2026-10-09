// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { MidnightView } from "../../contracts/views/MidnightView.sol";
import { console2 } from "forge-std/console2.sol";

contract TestMidnightView is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MidnightView cut;
    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    address TEST_USER;
    bytes32 MARKET_ID;
    // Market that was never touched, so Midnight.toMarket reverts for it.
    bytes32 UNTOUCHED_MARKET_ID = keccak256("MidnightView.untouchedMarket");

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        string memory chain = _chainFromProfile();
        uint256 forkBlock;

        if (keccak256(bytes(chain)) == keccak256("base")) {
            forkBlock = 51_432_696;
            TEST_USER = 0xC6877a65349B0fA45cC61a267eE682c7AbF2B369;
            MARKET_ID = 0x549cd072daf99328554f3a6d2d4d6f4a07f1c59369e891e6391946f9cf75f221;
        } else if (keccak256(bytes(chain)) == keccak256("mainnet")) {
            forkBlock = 25_997_769;
            TEST_USER = 0x26997a22A1a37952a8AfD55897d4Dd6b1f25db57;
            MARKET_ID = 0x6dae37424723dd8cef0da2db84fd2819f7dfa4e3a98e602ccc3c65ee1fac61c2;
        } else {
            vm.skip(true, "MidnightView test is only for base and mainnet");
        }

        _fork(_getRpcForChain(chain), forkBlock);
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

        assertEq(marketInfo.id, 0);
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
