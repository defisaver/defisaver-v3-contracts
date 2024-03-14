// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { AdminVault } from "../../contracts/auth/AdminVault.sol";
import { BaseTest } from "../utils/BaseTest.sol";

contract TestCore_AdminVault is AdminVault, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AdminVault cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        cut = new AdminVault();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_constructor() public {
        assertEq(cut.owner(), address(this));
        assertEq(cut.admin(), ADMIN_ADDR);
    }

    function test_change_owner() public {
        address newOwner = address(0x123);
        prank(ADMIN_ADDR);
        cut.changeOwner(newOwner);
        assertEq(cut.owner(), newOwner);
    }

    function test_change_owner_when_caller_is_not_admin() public {
        vm.expectRevert(abi.encodeWithSelector(SenderNotAdmin.selector));
        cut.changeOwner(address(0x123));
    }

    function test_change_admin() public {
        address newAdmin = address(0x123);
        prank(ADMIN_ADDR);
        cut.changeAdmin(newAdmin);
        assertEq(cut.admin(), newAdmin);
    }

    function test_change_admin_when_caller_is_not_admin() public {
        vm.expectRevert(abi.encodeWithSelector(SenderNotAdmin.selector));
        cut.changeAdmin(address(0x123));
    }
}
