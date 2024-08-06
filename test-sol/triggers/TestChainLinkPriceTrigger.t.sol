// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import { MainnetTriggerAddresses } from "../../contracts/triggers/helpers/MainnetTriggerAddresses.sol";
import { ChainLinkPriceTrigger } from "../../contracts/triggers/ChainLinkPriceTrigger.sol";
import { MainnetUtilAddresses } from "../../contracts/utils/helpers/MainnetUtilAddresses.sol";
import { TokenPriceHelper } from "../../contracts/utils/TokenPriceHelper.sol";
import { TokenUtils } from "../../contracts/utils/TokenUtils.sol";

contract TestChainLinkPriceTrigger is Test, MainnetTriggerAddresses, MainnetUtilAddresses, TokenPriceHelper{

    ChainLinkPriceTrigger trigger;

    function setUp() public {
        trigger = new ChainLinkPriceTrigger();
    }

    function testEthPriceFetch() public {
       uint256 price = getPriceInUSD(TokenUtils.ETH_ADDR);
       console.log(price);
       assertGt(price, 0);
    }

    function testEthWethPriceFetch() public {
       uint256 priceEth = getPriceInUSD(TokenUtils.ETH_ADDR);
       uint256 priceWEth = getPriceInUSD(TokenUtils.WETH_ADDR);

       assertEq(priceEth, priceWEth);
    }

    function testWsteth() public {
       uint256 priceWsteth = getPriceInUSD(WSTETH_ADDR);

       assertGt(priceWsteth, 0);
    }
}