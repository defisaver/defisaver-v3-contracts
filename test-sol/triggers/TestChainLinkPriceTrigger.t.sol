// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "forge-std/console.sol";
import "../../contracts/triggers/ChainLinkPriceTrigger.sol";

contract TestChainLinkPriceTrigger is DSTest, MainnetTriggerAddresses {

    ChainLinkPriceTrigger trigger;

    function setUp() public {
        trigger = new ChainLinkPriceTrigger();
    }

    function testEthPriceFetch() public {
       uint256 price = trigger.getPrice(TokenUtils.ETH_ADDR);
       console.log(price);
       assertGt(price, 0);
    }

    function testEthWethPriceFetch() public {
       uint256 priceEth = trigger.getPrice(TokenUtils.ETH_ADDR);
       uint256 priceWEth = trigger.getPrice(TokenUtils.WETH_ADDR);

       assertEq(priceEth, priceWEth);
    }

    function testWsteth() public {
       uint256 priceWsteth = trigger.getPrice(WSTETH_ADDR);

       assertGt(priceWsteth, 0);
    }

}