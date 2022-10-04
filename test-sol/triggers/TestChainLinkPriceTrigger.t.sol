// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "forge-std/console.sol";
import "../../contracts/triggers/ChainLinkPriceTrigger.sol";

contract TestChainLinkPriceTrigger is DSTest, MainnetTriggerAddresses, MainnetUtilAddresses, TokenPriceHelper{

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