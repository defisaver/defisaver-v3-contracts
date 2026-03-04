// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ChainLinkPriceTrigger } from "../../contracts/triggers/ChainLinkPriceTrigger.sol";
import { TokenPriceHelper } from "../../contracts/utils/token/TokenPriceHelper.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";
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
        forkFromEnv("ChainlinkPriceTrigger");

        if (block.chainid != 1) vm.skip(true, "ChainLinkPriceTrigger not available on L2s");

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
