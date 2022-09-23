// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "forge-std/console.sol";
import "../../contracts/actions/fee/GasFeeTaker.sol";
import "../CheatCodes.sol";
import "forge-std/Test.sol";

contract TestGasFeeTaker is DSTest, GasFeeTaker {
    GasFeeTaker feeTaker;

    address internal matic = 0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0;
    address internal aDAI = 0x028171bCA77440897B824Ca71D1c56caC55b68A3; //doesnt have chainlink oracle price
    address internal wbtc = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address internal AAVE_V2_MARKET = 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5;

    CheatCodes constant cheats = CheatCodes(HEVM_ADDRESS);

    function setUp() public {
        feeTaker = new GasFeeTaker();
    }

    function testGetWbtcPrice() public view {
        uint256 price = feeTaker.getPriceInUSD(wbtc);

        console.log(price);
    }

   function testGetMaticPrice() public view {
       uint256 price = feeTaker.getPriceInUSD(matic);

       console.log(price);
   }

   function testWBTCPrice() public {
        uint256 price = feeTaker.getPriceInETH(wbtc);

        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();

        uint aavePrice = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(wbtc);
        console.log(price);
        console.log(aavePrice);
   }
   function testDaiPrice() public {
        uint256 price = feeTaker.getPriceInETH(DAI_ADDR);

        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();

        uint aavePrice = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(DAI_ADDR);
        console.log(price);
        console.log(aavePrice);
   }

    function testPriceForNonTokenAddr() public {
        uint256 price = feeTaker.getPriceInUSD(aDAI);

        //  address priceOracleAddress =
        //         ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();

        // uint price = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(TokenUtils.WETH_ADDR);

        console.log(price);
        assertEq(price, 0);
   }

    function testGasCost() public {
        cheats.fee(100000000000);
        console.log(tx.gasprice);
        uint gasCost = feeTaker.calcGasCost(1_000_000, DAI_ADDR, 0);
        console.log("Gas cost:", gasCost);

        gasCost = feeTaker.calcGasCost(1_000_000, aDAI , 0);
        console.log("Gas cost:", gasCost);
        assertEq(gasCost, 0);

        gasCost = feeTaker.calcGasCost(1_000_000, WETH_ADDR, 0);
        console.log("Gas cost:", gasCost);
        assertEq(gasCost, 1_000_000 * tx.gasprice);
    }
  

}