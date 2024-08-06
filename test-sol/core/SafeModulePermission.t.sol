// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

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
        _disable_module(MODULE_ADDR);
        assertFalse(ISafe(walletAddr).isModuleEnabled(MODULE_ADDR));
    }

    function test_should_revert_when_disabling_module_that_is_not_enabled() public {
        vm.expectRevert();
        _disable_module(MODULE_ADDR);
    }

    function test_should_revert_when_disabling_sentinel_module_address() public {
        vm.expectRevert();
        _disable_module(SENTINEL_MODULES);
    }

    function test_enabling_two_modules_than_disabling_last_one() public {
        address firstModule = address(0x111);
        address secondModule = address(0x222);

        _enable_safe_module(firstModule);
        _enable_safe_module(secondModule);
        _disable_module(secondModule);

        assertFalse(ISafe(walletAddr).isModuleEnabled(secondModule));
        assertTrue(ISafe(walletAddr).isModuleEnabled(firstModule));
    }

    function test_enabling_two_modules_than_disabling_first_one() public {
        address firstModule = address(0x111);
        address secondModule = address(0x222);

        _enable_safe_module(firstModule);
        _enable_safe_module(secondModule);
        _disable_module(firstModule);

        assertTrue(ISafe(walletAddr).isModuleEnabled(secondModule));
        assertFalse(ISafe(walletAddr).isModuleEnabled(firstModule));
    }

    function test_enabling_three_modules_than_disabling_second_one() public {
        address firstModule = address(0x111);
        address secondModule = address(0x222);
        address thirdModule = address(0x333);

        _enable_safe_module(firstModule);
        _enable_safe_module(secondModule);
        _enable_safe_module(thirdModule);

        _disable_module(secondModule);

        assertTrue(ISafe(walletAddr).isModuleEnabled(firstModule));
        assertFalse(ISafe(walletAddr).isModuleEnabled(secondModule));
        assertTrue(ISafe(walletAddr).isModuleEnabled(thirdModule));
    }

    function test_enabling_three_modules_than_disabling_first_one() public {
        address firstModule = address(0x111);
        address secondModule = address(0x222);
        address thirdModule = address(0x333);

        _enable_safe_module(firstModule);
        _enable_safe_module(secondModule);
        _enable_safe_module(thirdModule);

        _disable_module(firstModule);

        assertFalse(ISafe(walletAddr).isModuleEnabled(firstModule));
        assertTrue(ISafe(walletAddr).isModuleEnabled(secondModule));
        assertTrue(ISafe(walletAddr).isModuleEnabled(thirdModule));
    }

    function test_should_revert_disabling_module_that_is_not_is_list_of_enabled_modules() public {
        address firstModule = address(0x111);
        address secondModule = address(0x222);
        address thirdModule = address(0x333);

        _enable_safe_module(firstModule);
        _enable_safe_module(secondModule);

        vm.expectRevert();
        _disable_module(thirdModule);
    }

    function test_should_revert_when_disabling_module_that_is_not_one_of_the_ten_last_modules() public {
        // this module can't be disabled because it's not one of the last 10 modules
        _enable_safe_module(address(0xff));
        
        // enable 10 modules
        _enable_safe_module(address(0x11));
        _enable_safe_module(address(0x22));        
        _enable_safe_module(address(0x33));        
        _enable_safe_module(address(0x44));        
        _enable_safe_module(address(0x55));        
        _enable_safe_module(address(0x66));        
        _enable_safe_module(address(0x77));        
        _enable_safe_module(address(0x88));        
        _enable_safe_module(address(0x99));        
        _enable_safe_module(address(0xaa));

        // try to disable first module added
        vm.expectRevert();
        _disable_module(address(0xff));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _enable_safe_module(address _moduleAddr) internal {
        bytes memory enableCalldata = abi.encodeWithSelector(SafeModulePermission.enableModule.selector, _moduleAddr);
        wallet.execute(address(cut), enableCalldata, 0);
    }

    function _disable_module(address _moduleAddr) internal {
        bytes memory disableCalldata = abi.encodeWithSelector(SafeModulePermission.disableModule.selector, _moduleAddr);
        wallet.execute(address(cut), disableCalldata, 0);
    }
}
