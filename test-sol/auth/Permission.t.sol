// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

import { Permission } from "../../contracts/auth/Permission.sol";
import { ISafe } from "../../contracts/interfaces/safe/ISafe.sol";
import { DSAuthority } from "../../contracts/DS/DSAuthority.sol";
import { DSAuth } from "../../contracts/DS/DSAuth.sol";
import { AuthHelper } from "../../contracts/auth/helpers/AuthHelper.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";

contract TestCore_Permission is AuthHelper, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    Permission cut;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet dsProxyWallet;
    SmartWallet safeWallet;
    address dsProxyAddr;
    address safeAddr;

    bytes4 constant EXECUTE_SELECTOR = bytes4(keccak256("execute(address,bytes)"));

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        cut = new Permission();

        safeWallet = new SmartWallet(bob);
        safeAddr = safeWallet.createSafe();
        
        dsProxyWallet = new SmartWallet(alice);
        dsProxyAddr = dsProxyWallet.createDSProxy();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_give_dsProxy_permission() public {
        _giveProxyPermission();
        _verifyProxyPermission();
    }

    function test_should_give_safe_permission() public {
        _giveSafePermission();
        _verifySafePermission();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _giveProxyPermission() internal {
        bytes memory givePermCalldata = abi.encodeWithSelector(
            Permission.giveWalletPermission.selector,
            true /* isDSProxy */
        );
        
        dsProxyWallet.execute(address(cut), givePermCalldata, 0);
    }

    function _giveSafePermission() internal {
        bytes memory givePermCalldata = abi.encodeWithSelector(
            Permission.giveWalletPermission.selector,
            false /* isDSProxy */
        );
        
        safeWallet.execute(address(cut), givePermCalldata, 0);
    }

    function _verifyProxyPermission() internal {
        DSAuthority authority = DSAuthority(DSAuth(dsProxyAddr).authority());
        assertTrue(
            authority.canCall(
                PROXY_AUTH_ADDRESS,
                dsProxyAddr,
                EXECUTE_SELECTOR
            )
        );
    }

    function _verifySafePermission() internal {
        assertTrue(ISafe(safeAddr).isModuleEnabled(MODULE_AUTH_ADDRESS));
    }
} 