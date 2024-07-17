// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import { CheatCodes } from "../CheatCodes.sol";
import { CompV3RatioTrigger } from "../../contracts/triggers/CompV3RatioTrigger.sol";
import { Tokens } from "../utils/Tokens.sol";
import { CompUser } from "../utils/compV3/CompUser.sol";
import { TokenAddresses } from "../TokenAddresses.sol";
import { DSMath } from "../../contracts/DS/DSMath.sol";

contract TestCompV3RatioTrigger is Test, DSMath, Tokens {
    CompV3RatioTrigger trigger;

    function setUp() public {
        trigger = new CompV3RatioTrigger();
    }

    function testGetSafetyRatio() public {
        CompUser robert = new CompUser();

        gibTokens(robert.proxyAddr(), TokenAddresses.WETH_ADDR, 1 ether);

        robert.supply(false, TokenAddresses.COMET_USDC, TokenAddresses.WETH_ADDR, 1 ether);
        robert.borrow(false, TokenAddresses.COMET_USDC, 1000e6);

        uint ratio = trigger.getSafetyRatio(TokenAddresses.COMET_USDC, address(robert.proxyAddr()));

        console.log(ratio);
    }
}