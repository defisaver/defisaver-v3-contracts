// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

import { ILendingPoolAddressesProviderV2 } from "../../../contracts/interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import { IPriceOracleGetterAave } from "../../../contracts/interfaces/aaveV2/IPriceOracleGetterAave.sol";
import { GasFeeTaker } from "../../../contracts/actions/fee/GasFeeTaker.sol";

import { BaseTest } from "../../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestGasFeeTaker is BaseTest, GasFeeTaker {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    GasFeeTaker cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    address internal matic = 0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0;
    address internal aDAI = 0x028171bCA77440897B824Ca71D1c56caC55b68A3; //doesn't have chainlink oracle price
    address internal wbtc = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address internal AAVE_V2_MARKET = 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("GasFeeTaker");
        cut = new GasFeeTaker();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function testGetWbtcPrice() public view {
        uint256 price = cut.getPriceInUSD(wbtc);

        console.log(price);
    }

   function testGetMaticPrice() public view {
       uint256 price = cut.getPriceInUSD(matic);

       console.log(price);
   }

   function testWBTCPrice() public view {
        uint256 price = cut.getPriceInETH(wbtc);

        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();

        uint aavePrice = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(wbtc);

        console.log(price);
        console.log(aavePrice);
   }
   
   function testDaiPrice() public view {
        uint256 price = cut.getPriceInETH(DAI_ADDR);

        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();

        uint aavePrice = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(DAI_ADDR);

        console.log(price);
        console.log(aavePrice);
   }

    function testPriceForNonTokenAddr() public {
        uint256 price = cut.getPriceInUSD(aDAI);

        console.log(price);

        assertEq(price, 0);
   }

    function testGasCost() public {
        vm.fee(100000000000);
        console.log(tx.gasprice);
        uint gasCost = cut.calcGasCost(1_000_000, DAI_ADDR, 0);
        console.log("Gas cost:", gasCost);

        gasCost = cut.calcGasCost(1_000_000, aDAI , 0);
        console.log("Gas cost:", gasCost);
        assertEq(gasCost, 0);

        gasCost = cut.calcGasCost(1_000_000, WETH_ADDR, 0);
        console.log("Gas cost:", gasCost);
        assertEq(gasCost, 1_000_000 * tx.gasprice);
    }
}