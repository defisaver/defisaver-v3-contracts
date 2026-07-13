// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SemiContinuousTracker } from "../../contracts/core/strategy/SemiContinuousTracker.sol";
import { ISubStorage } from "../../contracts/interfaces/core/ISubStorage.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";

import { Vm } from "forge-std/Vm.sol";
import { BaseTest } from "../utils/BaseTest.sol";

contract TestCore_SemiContinuousTracker is SemiContinuousTracker, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SemiContinuousTracker cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    uint256 internal constant SUB_ID = 3113;

    address subOwnerWallet;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new SemiContinuousTracker();

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(SUB_ID);
        subOwnerWallet = address(subData.walletAddr);
        assertTrue(subOwnerWallet != address(0));

        vm.label(subOwnerWallet, "SubOwnerWallet");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_set_sub_to_wallet() public {
        assertFalse(cut.isSet(SUB_ID));

        vm.expectEmit(true, true, false, true, address(cut));
        emit SetInStorage(SUB_ID, subOwnerWallet);

        prank(subOwnerWallet);
        cut.setSubToWallet(SUB_ID);

        assertTrue(cut.isSet(SUB_ID));
        assertEq(cut.getWalletForSub(SUB_ID), subOwnerWallet);
    }

    function test_should_return_early_when_sub_already_set() public {
        _setSubToWallet();

        vm.recordLogs();
        prank(subOwnerWallet);
        cut.setSubToWallet(SUB_ID);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 0);
        assertEq(cut.getWalletForSub(SUB_ID), subOwnerWallet);
    }

    function test_should_skip_owner_check_when_sub_already_set() public {
        _setSubToWallet();

        prank(bob);
        cut.setSubToWallet(SUB_ID);

        assertEq(cut.getWalletForSub(SUB_ID), subOwnerWallet);
    }

    function test_should_revert_when_setting_sub_for_non_owner() public {
        vm.expectRevert(abi.encodeWithSelector(NotSubOwner.selector, SUB_ID, bob));
        prank(bob);
        cut.setSubToWallet(SUB_ID);
    }

    function test_should_remove_wallet_for_sub() public {
        _setSubToWallet();

        vm.expectEmit(true, true, false, true, address(cut));
        emit RemovedFromStorage(SUB_ID, subOwnerWallet);

        prank(subOwnerWallet);
        cut.removeWalletForSub(SUB_ID);

        assertFalse(cut.isSet(SUB_ID));
        assertEq(cut.getWalletForSub(SUB_ID), address(0));
    }

    function test_should_return_early_when_removing_sub_that_is_not_set() public {
        assertFalse(cut.isSet(SUB_ID));

        vm.recordLogs();
        prank(subOwnerWallet);
        cut.removeWalletForSub(SUB_ID);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 0);
        assertFalse(cut.isSet(SUB_ID));
    }

    function test_should_skip_owner_check_when_removing_sub_that_is_not_set() public {
        prank(bob);
        cut.removeWalletForSub(SUB_ID);

        assertFalse(cut.isSet(SUB_ID));
    }

    function test_should_revert_when_removing_sub_for_non_owner() public {
        _setSubToWallet();

        vm.expectRevert(abi.encodeWithSelector(NotSubOwner.selector, SUB_ID, bob));
        prank(bob);
        cut.removeWalletForSub(SUB_ID);
    }

    function test_should_set_again_after_removal() public {
        _setSubToWallet();

        prank(subOwnerWallet);
        cut.removeWalletForSub(SUB_ID);
        assertFalse(cut.isSet(SUB_ID));

        _setSubToWallet();

        assertTrue(cut.isSet(SUB_ID));
        assertEq(cut.getWalletForSub(SUB_ID), subOwnerWallet);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _setSubToWallet() internal {
        prank(subOwnerWallet);
        cut.setSubToWallet(SUB_ID);
    }
}
