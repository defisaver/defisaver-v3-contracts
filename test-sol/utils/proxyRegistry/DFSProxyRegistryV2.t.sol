// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ChangeProxyOwner } from "../../../contracts/actions/utils/ChangeProxyOwner.sol";
import { IDSAuth } from "../../../contracts/interfaces/DS/IDSAuth.sol";
import { IDSProxy } from "../../../contracts/interfaces/DS/IDSProxy.sol";
import { IDSProxyFactory } from "../../../contracts/interfaces/DS/IDSProxyFactory.sol";
import { DFSProxyRegistryV2 } from "../../../contracts/utils/proxyRegistry/DFSProxyRegistryV2.sol";

import { BaseTest } from "test-sol/utils/BaseTest.sol";
import { RegistryUtils } from "test-sol/utils/RegistryUtils.sol";
import { Addresses } from "test-sol/utils/helpers/MainnetAddresses.sol";

/// @dev Looks like a DSProxy but is not created by the DSProxy factory
contract NonFactoryProxy {
    address public owner;

    constructor(address _owner) {
        owner = _owner;
    }
}

contract TestDFSProxyRegistryV2 is BaseTest, RegistryUtils {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    DFSProxyRegistryV2 cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    ChangeProxyOwner changeProxyOwner;
    address admin;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        cut = new DFSProxyRegistryV2();
        redeploy("DFSProxyRegistryV2", address(cut));

        changeProxyOwner = new ChangeProxyOwner();
        admin = cut.adminVault().owner();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SYNC TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_sync_movesProxyBetweenOwners() public {
        address proxy = _buildProxy(alice);
        cut.syncProxy(proxy);
        _assertOnlyAdditional(alice, proxy);

        _setOwner(proxy, alice, bob);

        // stale entry is filtered, new owner is not registered until sync
        assertEq(_additional(alice).length, 0);
        assertEq(_additional(bob).length, 0);

        cut.syncProxy(proxy);

        _assertOnlyAdditional(bob, proxy);
        assertEq(cut.additionalProxyIndex(alice, proxy), 0);
        assertEq(cut.trackedOwner(proxy), bob);
    }

    function test_sync_isIdempotent() public {
        address proxy = _buildProxy(alice);

        address[] memory proxies = new address[](2);
        proxies[0] = proxy;
        proxies[1] = proxy;
        cut.syncProxies(proxies);
        cut.syncProxy(proxy);

        _assertOnlyAdditional(alice, proxy);
        assertEq(cut.additionalProxyIndex(alice, proxy), 1);
    }

    function test_sync_revertsForNonFactoryProxy() public {
        address fakeProxy = address(new NonFactoryProxy(alice));
        address validProxy = _buildProxy(alice);

        vm.expectRevert(
            abi.encodeWithSelector(DFSProxyRegistryV2.InvalidDSProxy.selector, fakeProxy)
        );
        cut.syncProxy(fakeProxy);

        address[] memory proxies = new address[](2);
        proxies[0] = validProxy;
        proxies[1] = fakeProxy;

        vm.expectRevert(
            abi.encodeWithSelector(DFSProxyRegistryV2.InvalidDSProxy.selector, fakeProxy)
        );
        cut.syncProxies(proxies);

        assertEq(_additional(alice).length, 0);
    }

    function test_sync_removesProxyWhenOwnerSetToZero() public {
        address proxy = _buildProxy(alice);
        cut.syncProxy(proxy);

        _setOwner(proxy, alice, address(0));
        cut.syncProxy(proxy);

        assertEq(cut.additionalProxyIndex(alice, proxy), 0);
        assertEq(cut.additionalProxyIndex(address(0), proxy), 0);
        assertEq(cut.trackedOwner(proxy), address(0));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                MAKER PROXY TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_changeOwner_cannotReplaceMakerProxy() public {
        address makerProxy = _buildMakerProxy(bob);
        address proxy = _buildProxy(jane);

        _changeOwnerViaAction(proxy, jane, bob);

        (address mcdProxy, address[] memory additional) = cut.getAllProxies(bob);
        assertEq(mcdProxy, makerProxy);
        assertEq(additional.length, 1);
        assertEq(additional[0], proxy);
        assertEq(cut.trackedOwner(proxy), bob);
    }

    function test_makerProxy_isNeverListedAsAdditional() public {
        address makerProxy = _buildMakerProxy(alice);

        cut.syncProxy(makerProxy);
        vm.prank(alice);
        cut.restoreAdditionalProxy(alice, makerProxy);

        (address mcdProxy, address[] memory additional) = cut.getAllProxies(alice);
        assertEq(mcdProxy, makerProxy);
        assertEq(additional.length, 0);
        assertEq(cut.additionalProxyIndex(alice, makerProxy), 0);
    }

    function test_makerProxy_transferredAwayIsAdditionalForNewOwner() public {
        address makerProxy = _buildMakerProxy(alice);

        _setOwner(makerProxy, alice, bob);
        cut.syncProxy(makerProxy);

        assertEq(cut.getMcdProxy(alice), address(0));
        assertEq(cut.getMcdProxy(bob), address(0));
        _assertOnlyAdditional(bob, makerProxy);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                 EXCLUSION TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_exclusion_userCanPreemptivelyBlockProxy() public {
        address proxy = _buildProxy(jane);

        vm.prank(alice);
        cut.removeAdditionalProxy(alice, proxy);

        _changeOwnerViaAction(proxy, jane, alice);

        assertEq(IDSProxy(proxy).owner(), alice);
        assertEq(_additional(alice).length, 0);
    }

    function test_restore_userCanRestoreOwnRemovedProxy() public {
        address proxy = _buildProxy(alice);
        cut.syncProxy(proxy);

        vm.prank(alice);
        cut.removeAdditionalProxy(alice, proxy);
        cut.syncProxy(proxy);
        assertEq(_additional(alice).length, 0);

        vm.prank(alice);
        cut.restoreAdditionalProxy(alice, proxy);

        assertFalse(cut.removedProxies(alice, proxy));
        _assertOnlyAdditional(alice, proxy);
    }

    function test_restore_registersNeverSyncedProxy() public {
        address proxy = _buildProxy(alice);

        vm.prank(alice);
        cut.restoreAdditionalProxy(alice, proxy);

        _assertOnlyAdditional(alice, proxy);
        assertEq(cut.trackedOwner(proxy), alice);
    }

    function test_restore_onlyClearsGivenUsersExclusion() public {
        address proxy = _buildProxy(alice);

        vm.prank(alice);
        cut.removeAdditionalProxy(alice, proxy);
        vm.prank(charlie);
        cut.removeAdditionalProxy(charlie, proxy);

        // proxy is moved to charlie right before admin restores it for alice
        _setOwner(proxy, alice, charlie);
        vm.prank(admin);
        cut.restoreAdditionalProxy(alice, proxy);

        assertFalse(cut.removedProxies(alice, proxy));
        assertTrue(cut.removedProxies(charlie, proxy));
        assertEq(cut.trackedOwner(proxy), charlie);
        assertEq(_additional(alice).length, 0);
        assertEq(_additional(charlie).length, 0);
    }

    function test_remove_keepsIndexesConsistent() public {
        address[] memory proxies = new address[](3);
        for (uint256 i = 0; i < proxies.length; ++i) {
            proxies[i] = _buildProxy(alice);
        }
        cut.syncProxies(proxies);

        address[] memory toRemove = new address[](2);
        toRemove[0] = proxies[0];
        toRemove[1] = makeAddr("notRegistered");

        vm.prank(alice);
        cut.removeAdditionalProxies(alice, toRemove);

        address[] memory additional = _additional(alice);
        assertEq(additional.length, 2);
        assertEq(cut.additionalProxyIndex(alice, proxies[0]), 0);
        for (uint256 i = 0; i < additional.length; ++i) {
            assertEq(cut.additionalProxyIndex(alice, additional[i]), i + 1);
            assertEq(cut.additionalProxies(alice, i), additional[i]);
        }
    }

    function test_auth_onlyUserOrOwnerCanChangeExclusions() public {
        address proxy = _buildProxy(alice);
        address[] memory proxies = new address[](1);
        proxies[0] = proxy;

        bytes memory notAuthorized =
            abi.encodeWithSelector(DFSProxyRegistryV2.SenderNotUserOrOwner.selector, bob, alice);

        vm.startPrank(bob);
        vm.expectRevert(notAuthorized);
        cut.removeAdditionalProxy(alice, proxy);
        vm.expectRevert(notAuthorized);
        cut.removeAdditionalProxies(alice, proxies);
        vm.expectRevert(notAuthorized);
        cut.restoreAdditionalProxy(alice, proxy);
        vm.stopPrank();

        vm.prank(admin);
        cut.removeAdditionalProxy(alice, proxy);
        assertTrue(cut.removedProxies(alice, proxy));

        vm.prank(alice);
        cut.restoreAdditionalProxy(alice, proxy);
        assertFalse(cut.removedProxies(alice, proxy));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _buildProxy(address _owner) internal returns (address) {
        return address(IDSProxyFactory(Addresses.DS_PROXY_FACTORY).build(_owner));
    }

    function _buildMakerProxy(address _owner) internal returns (address) {
        return cut.MCD_REGISTRY().build(_owner);
    }

    function _setOwner(address _proxy, address _caller, address _newOwner) internal {
        vm.prank(_caller);
        IDSAuth(_proxy).setOwner(_newOwner);
    }

    function _changeOwnerViaAction(address _proxy, address _caller, address _newOwner) internal {
        bytes memory callData = abi.encodeCall(
            ChangeProxyOwner.executeActionDirect,
            (abi.encode(ChangeProxyOwner.Params({ newOwner: _newOwner })))
        );

        vm.prank(_caller);
        IDSProxy(_proxy).execute(address(changeProxyOwner), callData);
    }

    function _additional(address _user) internal view returns (address[] memory proxies) {
        (, proxies) = cut.getAllProxies(_user);
    }

    function _assertOnlyAdditional(address _user, address _proxy) internal view {
        address[] memory proxies = _additional(_user);
        assertEq(proxies.length, 1);
        assertEq(proxies[0], _proxy);
    }
}
