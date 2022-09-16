// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "../CheatCodes.sol";

import "../../contracts/triggers/CompV3RatioTrigger.sol";
import "../utils/Tokens.sol";
import "../utils/CompUser.sol";
import "../TokenAddresses.sol";


contract TestCompV3RatioTrigger is DSTest, DSMath, Tokens {
    CompV3RatioTrigger trigger;

    function setUp() public {
        trigger = new CompV3RatioTrigger();
    }

    function testGetSafetyRatio() public {
        CompUser robert = new CompUser();

        gibTokens(robert.proxyAddr(), TokenAddresses.WETH_ADDR, 1 ether);

        robert.supply(TokenAddresses.COMET_USDC, TokenAddresses.WETH_ADDR, 1 ether);
        robert.borrow(TokenAddresses.COMET_USDC, 1000e6);

        uint ratio = trigger.getSafetyRatio(TokenAddresses.COMET_USDC, address(robert.proxyAddr()));

        console.log(ratio);
    }

}