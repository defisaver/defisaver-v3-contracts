// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import {
    ILendingPoolAddressesProviderV2
} from "../../../contracts/interfaces/protocols/aaveV2/ILendingPoolAddressesProviderV2.sol";
import {
    IPriceOracleGetterAave
} from "../../../contracts/interfaces/protocols/aaveV2/IPriceOracleGetterAave.sol";
import { GasFeeTaker } from "../../../contracts/actions/fee/GasFeeTaker.sol";
import { GasFeeTakerL2 } from "../../../contracts/actions/fee/GasFeeTakerL2.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";

contract TestGasFeeTaker is BaseTest, GasFeeTaker, AaveV3Helper {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    GasFeeTaker cut;
    GasFeeTakerL2 cutL2;
    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    address internal aDAI = 0x028171bCA77440897B824Ca71D1c56caC55b68A3; //doesn't have chainlink oracle price

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new GasFeeTaker();
        cutL2 = new GasFeeTakerL2();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function testGetWbtcPrice() public view {
        uint256 price =
            block.chainid == 1 ? cut.getPriceInUSD(WBTC_ADDR) : cutL2.getPriceInUSD(WBTC_ADDR);

        address priceOracleAddress =
            ILendingPoolAddressesProviderV2(DEFAULT_AAVE_MARKET).getPriceOracle();
        uint256 aavePrice = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(WBTC_ADDR);

        console.log(price);
        console.log(aavePrice);

        // Assume that it will stay in this price range for a while
        assertGt(price, 30_000e8); // 30_000 USD
        assertLt(price, 300_000e8); // 300_000 USD

        // 16 is 1%
        // 15 is 0.1%
        // 14 is 0.01%

        assertApproxEqRel(price, aavePrice, 1e16); // 1% diff between price and aave price
    }

    function testWBTCPriceInETH() public view {
        uint256 price =
            block.chainid == 1 ? cut.getPriceInETH(WBTC_ADDR) : cutL2.getPriceInETH(WBTC_ADDR);

        console.log(price);

        // Assume that it will stay in this price range for a while. If not, we will think of a better way for check
        assertGt(price, 5e18); // 5 ETH for 1 WBTC
        assertLt(price, 50e18); // 50 ETH for 1 WBTC
    }

    function testDaiPrice() public view {
        uint256 priceInETH =
            block.chainid == 1 ? cut.getPriceInETH(DAI_ADDR) : cutL2.getPriceInETH(DAI_ADDR);
        console.log(priceInETH);
        assertGt(priceInETH, 0);

        uint256 priceInUSD =
            block.chainid == 1 ? cut.getPriceInUSD(DAI_ADDR) : cutL2.getPriceInUSD(DAI_ADDR);
        console.log(priceInUSD);
        assertApproxEqRel(priceInUSD, 1e8, 1e15); // 0.1% diff between price and 1 USD
    }

    function testPriceForNonTokenAddr() public view {
        uint256 price = block.chainid == 1 ? cut.getPriceInUSD(aDAI) : cutL2.getPriceInUSD(aDAI);
        console.log(price);
        assertEq(price, 0);
    }

    function testGasCost() public {
        // TODO -> Fix this test for L2s
        if (block.chainid != 1) vm.skip(true);

        vm.fee(100_000_000_000);
        console.log(tx.gasprice);
        uint256 gasCost = cut.calcGasCost(1_000_000, DAI_ADDR, 0);
        console.log("Gas cost:", gasCost);

        gasCost = cut.calcGasCost(1_000_000, aDAI, 0);
        console.log("Gas cost:", gasCost);
        assertEq(gasCost, 0);

        gasCost = cut.calcGasCost(1_000_000, WETH_ADDR, 0);
        console.log("Gas cost:", gasCost);
        assertEq(gasCost, 1_000_000 * tx.gasprice);
    }
}
