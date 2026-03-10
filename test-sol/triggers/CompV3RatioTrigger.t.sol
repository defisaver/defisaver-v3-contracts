// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { CompV3RatioTrigger } from "../../contracts/triggers/CompV3RatioTrigger.sol";
import { CompUser } from "../utils/compV3/CompUser.sol";
import { Addresses } from "../utils/Addresses.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestCompV3RatioTrigger is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    CompV3RatioTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("CompV3RatioTrigger");
        cut = new CompV3RatioTrigger();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function testGetSafetyRatio() public {
        CompUser robert = new CompUser();

        gibTokens(robert.proxyAddr(), Addresses.WETH_ADDR, 1 ether);

        robert.supply(false, Addresses.COMET_USDC, Addresses.WETH_ADDR, 1 ether);
        robert.borrow(false, Addresses.COMET_USDC, 1000e6);

        uint256 ratio = cut.getSafetyRatio(Addresses.COMET_USDC, address(robert.proxyAddr()));

        console.log(ratio);
    }
}
