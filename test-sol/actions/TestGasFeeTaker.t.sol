// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "forge-std/console.sol";
import "../../contracts/actions/fee/GasFeeTaker.sol";
import "../CheatCodes.sol";

contract TestGasFeeTaker is DSTest, GasFeeTaker {
    GasFeeTaker feeTaker;

    address internal matic = 0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0;
    address internal nonTokenAddr = 0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF;
    address internal wbtc = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;

    CheatCodes constant cheats = CheatCodes(HEVM_ADDRESS);

    function setUp() public {
        feeTaker = new GasFeeTaker();
    }

    function testGetWbtcPrice() public view {
        uint256 price = feeTaker.getTokenPrice(wbtc);

        console.log(price);
    }

   function testGetMaticPrice() public view {
       uint256 price = feeTaker.getTokenPrice(matic);

       console.log(price);
   }

    function testPriceForNonTokenAddr() public view {
        uint256 price = feeTaker.getTokenPrice(nonTokenAddr);

        //  address priceOracleAddress =
        //         ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();

        // uint price = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(TokenUtils.WETH_ADDR);

        console.log(price);
   }

    function testGasCost() public {
        cheats.fee(100000000000);
        console.log(tx.gasprice);
        uint gasCost = feeTaker.calcGasCost(1_000_000, matic);

        console.log("Gas cost:", gasCost);
    }
  

}