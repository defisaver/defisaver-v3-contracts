// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { AdminAuth } from "../../contracts/auth/AdminAuth.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { Const } from "../Const.sol";
import { TokenAddresses } from "../TokenAddresses.sol";

contract TestCore_AdminAuth is AdminAuth, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AdminAuth cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        cut = new AdminAuth();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_withdraw_stuck_eth() public {
        uint256 stuckAmount = 1000;
        vm.deal(address(cut), stuckAmount);

        uint256 balanceBefore = address(this).balance;

        prank(Const.OWNER_ACC);
        cut.withdrawStuckFunds(
            0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE,
            address(this),
            stuckAmount
        );

        uint256 balanceAfter = address(this).balance;

        assertEq(balanceAfter, balanceBefore + stuckAmount);
    }

    function test_should_withdraw_stuck_erc20() public {
        uint256 stuckAmount = 1000;
        address token = TokenAddresses.WETH_ADDR;
        deal(token, address(cut), stuckAmount);

        uint256 balanceBefore = balanceOf(token, address(this));

        prank(Const.OWNER_ACC);
        cut.withdrawStuckFunds(token, address(this), stuckAmount);

        uint256 balanceAfter = balanceOf(token, address(this));

        assertEq(balanceAfter, balanceBefore + stuckAmount);
    }

    function test_withdraw_stuck_funds_when_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.withdrawStuckFunds(TokenAddresses.WETH_ADDR, address(this), 1000);
    }

    function test_should_kill_contract() public {
        vm.deal(address(cut), 1000);
        uint256 cutBalance = address(cut).balance;

        address caller = Const.ADMIN_ACC;

        uint256 callerBalanceBefore = caller.balance;

        vm.prank(caller);
        cut.kill();

        uint256 callerBalanceAfter = caller.balance;

        assertEq(callerBalanceAfter, callerBalanceBefore + cutBalance);        
    }

    function test_kill_contract_when_caller_not_admin() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotAdmin.selector));
        cut.kill();
    }

    receive() external payable {}
}
