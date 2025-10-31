// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MockPermission } from "../../contracts/mocks/MockPermission.sol";
import { IInstaAccount } from "../../contracts/interfaces/protocols/insta/IInstaAccount.sol";
import { ISafe } from "../../contracts/interfaces/protocols/safe/ISafe.sol";
import { IDSAuthority } from "../../contracts/interfaces/DS/IDSAuthority.sol";
import { IDSAuth } from "../../contracts/interfaces/DS/IDSAuth.sol";
import { AuthHelper } from "../../contracts/auth/helpers/AuthHelper.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { WalletType } from "../../contracts/utils/DFSTypes.sol";

contract TestCore_Permission is AuthHelper, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MockPermission cut;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet dsProxyWallet;
    SmartWallet safeWallet;
    SmartWallet dsaProxyWallet;
    address dsProxyAddr;
    address safeAddr;
    address dsaProxyAddr;

    bytes4 constant EXECUTE_SELECTOR = bytes4(keccak256("execute(address,bytes)"));

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        cut = new MockPermission();

        safeWallet = new SmartWallet(bob);
        safeAddr = safeWallet.createSafe();

        dsProxyWallet = new SmartWallet(alice);
        dsProxyAddr = dsProxyWallet.createDSProxy();

        dsaProxyWallet = new SmartWallet(charlie);
        dsaProxyAddr = dsaProxyWallet.createDSAProxy();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_giveAndRemove_dsProxy_authContractPermission() public {
        _givePermission(WalletType.DSPROXY, true, PROXY_AUTH_ADDRESS);
        _verifyDSProxyPermission(PROXY_AUTH_ADDRESS, true);
        _removePermission(WalletType.DSPROXY, true, PROXY_AUTH_ADDRESS);
        _verifyDSProxyPermission(PROXY_AUTH_ADDRESS, false);
    }

    function test_giveAndRemove_dsProxy_arbitraryPermission() public {
        address addr = address(0x111);
        _givePermission(WalletType.DSPROXY, false, addr);
        _verifyDSProxyPermission(addr, true);
        _removePermission(WalletType.DSPROXY, false, addr);
        _verifyDSProxyPermission(addr, false);
    }

    function test_giveAndRemove_safe_authContractPermission() public {
        _givePermission(WalletType.SAFE, true, MODULE_AUTH_ADDRESS);
        _verifySafePermission(MODULE_AUTH_ADDRESS, true);
        _removePermission(WalletType.SAFE, true, MODULE_AUTH_ADDRESS);
        _verifySafePermission(MODULE_AUTH_ADDRESS, false);
    }

    function test_giveAndRemove_safe_arbitraryPermission() public {
        address addr = address(0x111);
        _givePermission(WalletType.SAFE, false, addr);
        _verifySafePermission(addr, true);
        _removePermission(WalletType.SAFE, false, addr);
        _verifySafePermission(addr, false);
    }

    function test_giveAndRemove_dsaProxy_arbitraryPermission() public {
        address addr = address(0x111);
        _giveDsaProxyPermission(addr);
        _verifyDsaProxyPermission(addr, true);
        _removeDsaProxyPermission(addr);
        _verifyDsaProxyPermission(addr, false);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _givePermission(WalletType _walletType, bool _isAuthPermission, address _to) internal {
        bool isDSProxyWallet = _walletType == WalletType.DSPROXY;
        bytes memory givePermCalldata = _isAuthPermission
            ? abi.encodeCall(MockPermission.givePermissionToAuthContract, (isDSProxyWallet))
            : abi.encodeCall(MockPermission.givePermissionTo, (_walletType, _to));

        _getWalletByType(_walletType).execute(address(cut), givePermCalldata, 0);
    }

    function _removePermission(WalletType _walletType, bool _isAuthPermission, address _from)
        internal
    {
        bool isDSProxyWallet = _walletType == WalletType.DSPROXY;
        bytes memory removePermCalldata = _isAuthPermission
            ? abi.encodeCall(MockPermission.removePermissionFromAuthContract, (isDSProxyWallet))
            : abi.encodeCall(MockPermission.removePermissionFrom, (_walletType, _from));

        _getWalletByType(_walletType).execute(address(cut), removePermCalldata, 0);
    }

    /// @dev Mock DSA tests.
    /// Tested through RecipeExecutor and DefiSaverConnector because we can't execute arbitrary calls to DSA Proxy Account
    function _giveDsaProxyPermission(address _addr) internal {
        // Self-call to enable permission (simulate execution in the context of the DSA Proxy Account)
        vm.prank(dsaProxyAddr);
        IInstaAccount(dsaProxyAddr).enable(_addr);
    }

    function _removeDsaProxyPermission(address _addr) internal {
        // Self-call to disable permission (simulate execution in the context of the DSA Proxy Account)
        vm.prank(dsaProxyAddr);
        IInstaAccount(dsaProxyAddr).disable(_addr);
    }

    function _verifyDSProxyPermission(address _addr, bool _enabled) internal view {
        IDSAuthority authority = IDSAuthority(IDSAuth(dsProxyAddr).authority());
        bool canCall = authority.canCall(_addr, dsProxyAddr, EXECUTE_SELECTOR);
        if (_enabled) {
            assertTrue(canCall);
        } else {
            assertFalse(canCall);
        }
    }

    function _verifySafePermission(address _addr, bool _enabled) internal view {
        bool isEnabled = ISafe(safeAddr).isModuleEnabled(_addr);
        if (_enabled) {
            assertTrue(isEnabled);
        } else {
            assertFalse(isEnabled);
        }
    }

    function _verifyDsaProxyPermission(address _addr, bool _enabled) internal view {
        bool isAuth = IInstaAccount(dsaProxyAddr).isAuth(_addr);
        if (_enabled) {
            assertTrue(isAuth);
        } else {
            assertFalse(isAuth);
        }
    }

    function _getWalletByType(WalletType _walletType) internal view returns (SmartWallet wallet) {
        if (_walletType == WalletType.DSPROXY) {
            return dsProxyWallet;
        } else if (_walletType == WalletType.SAFE) {
            return safeWallet;
        } else if (_walletType == WalletType.DSAPROXY) {
            return dsaProxyWallet;
        }
    }
}
