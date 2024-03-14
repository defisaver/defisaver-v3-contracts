// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { SafeModulePermission } from "../../contracts/auth/SafeModulePermission.sol";
import { ISafe } from "../../contracts/interfaces/safe/ISafe.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { Const } from "../Const.sol";

contract TestCore_SafeModulePermission is SafeModulePermission, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SafeModulePermission cut;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;

    address MODULE_ADDR = address(0xee);

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        walletAddr = wallet.createSafe();
        sender = wallet.owner();

        cut = new SafeModulePermission();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_enable_safe_module() public {
        _enable_safe_module(MODULE_ADDR);
        assertTrue(ISafe(walletAddr).isModuleEnabled(MODULE_ADDR));
    }

    function test_should_ignore_when_enabling_same_module_twice() public {
        _enable_safe_module(MODULE_ADDR);
        _enable_safe_module(MODULE_ADDR);
        assertTrue(ISafe(walletAddr).isModuleEnabled(MODULE_ADDR));
    }

    function test_should_revert_when_enabling_zero_address() public {
        vm.expectRevert();
        _enable_safe_module(address(0));
    }

    function test_should_revert_when_enabling_sentinel_module_address() public {
        vm.expectRevert();
        _enable_safe_module(SENTINEL_MODULES);
    }

    function test_should_disable_last_module() public {
        _enable_safe_module(MODULE_ADDR);
        _disable_last_module(MODULE_ADDR);
        assertFalse(ISafe(walletAddr).isModuleEnabled(MODULE_ADDR));
    }

    function test_should_revert_when_disabling_module_that_is_not_enabled() public {
        vm.expectRevert();
        _disable_last_module(MODULE_ADDR);
    }

    function test_should_revert_when_disabling_sentinel_module_address() public {
        vm.expectRevert();
        _disable_last_module(SENTINEL_MODULES);
    }

    function test_enabling_two_modules_than_disabling_last_one() public {
        address firstModule = address(0x111);
        address secondModule = address(0x222);

        _enable_safe_module(firstModule);
        _enable_safe_module(secondModule);
        _disable_last_module(secondModule);

        assertFalse(ISafe(walletAddr).isModuleEnabled(secondModule));
        assertTrue(ISafe(walletAddr).isModuleEnabled(firstModule));
    }

    function test_should_revert_when_disabling_module_that_is_not_last_module() public {
        address firstModule = address(0x111);
        address secondModule = address(0x222);
        address thirdModule = address(0x333);

        _enable_safe_module(firstModule);
        _enable_safe_module(secondModule);
        _enable_safe_module(thirdModule);

        vm.expectRevert();
        _disable_last_module(secondModule);
    }

    function test_should_revert_disabling_module_that_is_not_is_list_of_enabled_modules() public {
        address firstModule = address(0x111);
        address secondModule = address(0x222);
        address thirdModule = address(0x333);

        _enable_safe_module(firstModule);
        _enable_safe_module(secondModule);

        vm.expectRevert();
        _disable_last_module(thirdModule);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _enable_safe_module(address _moduleAddr) internal {
        bytes memory enableCalldata = abi.encodeWithSelector(SafeModulePermission.enableModule.selector, _moduleAddr);
        wallet.execute(address(cut), enableCalldata, 0);
    }

    function _disable_last_module(address _moduleAddr) internal {
        bytes memory disableCalldata = abi.encodeWithSelector(SafeModulePermission.disableLastModule.selector, _moduleAddr);
        wallet.execute(address(cut), disableCalldata, 0);
    }
}
