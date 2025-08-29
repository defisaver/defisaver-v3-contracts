// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ChainLinkPriceTrigger } from "../../contracts/triggers/ChainLinkPriceTrigger.sol";
import { TokenPriceHelper } from "../../contracts/utils/TokenPriceHelper.sol";
import { Addresses } from "../utils/Addresses.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestChainLinkPriceTrigger is BaseTest, TokenPriceHelper {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    ChainLinkPriceTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("ChainlinkPriceTrigger");
        cut = new ChainLinkPriceTrigger();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function testEthPriceFetch() public view {
        uint256 price = getPriceInUSD(Addresses.ETH_ADDR);
        console.log(price);
        assertGt(price, 0);
    }

    function testEthWethPriceFetch() public view {
        uint256 priceEth = getPriceInUSD(Addresses.ETH_ADDR);
        uint256 priceWEth = getPriceInUSD(Addresses.WETH_ADDR);

        assertEq(priceEth, priceWEth);
    }

    function testWsteth() public view {
        uint256 priceWsteth = getPriceInUSD(Addresses.WSTETH_ADDR);

        assertGt(priceWsteth, 0);
    }
}
