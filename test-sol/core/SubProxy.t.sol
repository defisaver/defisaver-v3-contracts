// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { SubProxy } from "../../contracts/core/strategy/SubProxy.sol";
import { SubStorage } from "../../contracts/core/strategy/SubStorage.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";

import { ISafe } from "../../contracts/interfaces/safe/ISafe.sol";
import { DSAuth } from "../../contracts/DS/DSAuth.sol";
import { DSAuthority } from "../../contracts/DS/DSAuthority.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";

contract TestCore_SubProxy is SubStorage, BaseTest {

    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SubProxy cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    bytes4 public constant EXECUTE_SELECTOR = bytes4(keccak256("execute(address,bytes)"));

    SubStorage subStorage;
    SmartWallet wallet;
    address walletAddr;
    address sender;

    StrategyModel.StrategySub sub;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        walletAddr = wallet.walletAddr();
        sender = wallet.owner();

        cut = new SubProxy();
        subStorage = SubStorage(SUB_STORAGE_ADDR);

        sub = StrategyModel.StrategySub({
            strategyOrBundleId: 1,
            isBundle: false,
            triggerData: new bytes[](0),
            subData: new bytes32[](0)
        });
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_subscribe_to_strategy() public {
        uint256 expectedId = subStorage.getSubsCount();
        bytes32 expectedHash = keccak256(abi.encode(sub));

        vm.expectEmit(true, true, true, true, address(subStorage));
        emit Subscribe(expectedId, walletAddr, expectedHash, sub);

        wallet.execute(
            address(cut),
            abi.encodeWithSelector(SubProxy.subscribeToStrategy.selector, sub),
            0
        );

        if (wallet.isSafe()) {
            assertTrue(ISafe(walletAddr).isModuleEnabled(MODULE_AUTH_ADDRESS));
        } else {
            DSAuthority authority = DSAuthority(DSAuth(walletAddr).authority());
            assertTrue(authority.canCall(PROXY_AUTH_ADDRESS, walletAddr, EXECUTE_SELECTOR));
        }
    }

    function test_should_update_strategy() public {
        uint256 subId = subStorage.getSubsCount();

        wallet.execute(
            address(cut),
            abi.encodeWithSelector(SubProxy.subscribeToStrategy.selector, sub),
            0
        );

        vm.expectEmit(true, true, false, true, address(subStorage));
        emit UpdateData(subId, keccak256(abi.encode(sub)), sub);

        wallet.execute(
            address(cut),
            abi.encodeWithSelector(SubProxy.updateSubData.selector, subId, sub),
            0
        );
    }

    function test_should_activate_sub() public {
        uint256 subId = subStorage.getSubsCount();

        wallet.execute(
            address(cut),
            abi.encodeWithSelector(SubProxy.subscribeToStrategy.selector, sub),
            0
        );

        vm.expectEmit(true, false, false, false, address(subStorage));
        emit ActivateSub(subId);

        wallet.execute(
            address(cut),
            abi.encodeWithSelector(SubProxy.activateSub.selector, subId),
            0
        );
        StrategyModel.StoredSubData memory storedSub = subStorage.getSub(subId);
        assertTrue(storedSub.isEnabled);
        assertEq(address(storedSub.walletAddr), walletAddr);
    }

    function test_should_update_and_active_sub() public {
        uint256 subId = subStorage.getSubsCount();

        wallet.execute(
            address(cut),
            abi.encodeWithSelector(SubProxy.subscribeToStrategy.selector, sub),
            0
        );

        vm.expectEmit(true, true, false, true, address(subStorage));
        emit UpdateData(subId, keccak256(abi.encode(sub)), sub);

        vm.expectEmit(true, false, false, false, address(subStorage));
        emit ActivateSub(subId);

        wallet.execute(
            address(cut),
            abi.encodeWithSelector(SubProxy.updateAndActivateSub.selector, subId, sub),
            0
        );
        StrategyModel.StoredSubData memory storedSub = subStorage.getSub(subId);
        assertTrue(storedSub.isEnabled);
        assertEq(address(storedSub.walletAddr), walletAddr);
    }

    function test_should_deactivate_sub() public {
        uint256 subId = subStorage.getSubsCount();

        wallet.execute(
            address(cut),
            abi.encodeWithSelector(SubProxy.subscribeToStrategy.selector, sub),
            0
        );

        vm.expectEmit(true, false, false, false, address(subStorage));
        emit DeactivateSub(subId);

        wallet.execute(
            address(cut),
            abi.encodeWithSelector(SubProxy.deactivateSub.selector, subId),
            0
        );
        StrategyModel.StoredSubData memory storedSub = subStorage.getSub(subId);
        assertFalse(storedSub.isEnabled);
        assertEq(address(storedSub.walletAddr), walletAddr);
    }
}
