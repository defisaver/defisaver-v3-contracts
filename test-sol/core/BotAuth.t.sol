// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { BotAuth } from "../../contracts/core/strategy/BotAuth.sol";
import { AdminAuth } from "../../contracts/auth/AdminAuth.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { Const } from "../Const.sol";

contract TestCore_BotAuth is BaseTest {

    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    BotAuth cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("BotAuth");
        cut = new BotAuth();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_add_caller() public {
        startPrank(Const.OWNER_ACC);
        
        cut.addCaller(bob);
        assertTrue(cut.approvedCallers(bob));
        
        stopPrank();
    }

    function test_should_remove_caller() public {
        startPrank(Const.OWNER_ACC);
        
        cut.addCaller(bob);
        assertTrue(cut.approvedCallers(bob));

        cut.removeCaller(bob);
        assertFalse(cut.approvedCallers(bob));
        
        stopPrank();
    }

    function test_should_revert_when_adding_caller_if_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.addCaller(bob);
    }

    function test_should_revert_removing_caller_if_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.removeCaller(bob);
    }
}
