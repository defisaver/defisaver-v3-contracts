// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { Pausable } from "../../contracts/auth/Pausable.sol";
import { AdminAuth } from "../../contracts/auth/AdminAuth.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { Const } from "../Const.sol";

/// @dev Used so we can call external setPaused function and test notPaused modifier 
contract PausableContract is Pausable {
    function testModifier() public view notPaused returns(bool) { 
        return true; 
    }
}

contract TestCore_Pausable is Pausable, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    PausableContract pausable;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        pausable = new PausableContract();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_set_paused_than_unpause_again() public {
        assertFalse(pausable.isPaused());
        prank(Const.ADMIN_ACC);
        pausable.setPaused(true);
        assertTrue(pausable.isPaused());
        prank(Const.ADMIN_ACC);
        pausable.setPaused(false);
        assertFalse(pausable.isPaused());
    }

    function test_set_paused_when_caller_not_admin() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotAdmin.selector));
        pausable.setPaused(true);
    }

    function test_should_revert_when_contract_is_paused() public {
        prank(Const.ADMIN_ACC);
        pausable.setPaused(true);
        vm.expectRevert(abi.encodeWithSelector(Pausable.ContractPaused.selector));
        pausable.testModifier();
    }

    function test_should_execute_call_when_contract_is_not_paused() public {
        assertTrue(pausable.testModifier());
    }
}
