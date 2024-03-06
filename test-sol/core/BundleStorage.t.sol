// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { BundleStorage } from "../../contracts/core/strategy/BundleStorage.sol";
import { StrategyStorage } from "../../contracts/core/strategy/StrategyStorage.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { AdminAuth } from "../../contracts/auth/AdminAuth.sol";
import { CoreHelper } from "../../contracts/core/helpers/CoreHelper.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { Const } from "../Const.sol";

contract TestCore_BundleStorage is BaseTest, CoreHelper {

    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    BundleStorage cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    event BundleCreated(uint256 indexed bundleId);
    StrategyStorage strategyStorage;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        cut = new BundleStorage();
        strategyStorage = StrategyStorage(STRATEGY_STORAGE_ADDR);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_open_to_public_should_be_false_by_default() public {
        bool openToPublic = cut.openToPublic();
        assertFalse(openToPublic);
    }

    function test_should_add_and_fetch_bundle_as_owner() public {
        address sender = Const.OWNER_ACC;
        _should_add_and_fetch_bundle(sender);
    }

    function test_should_add_and_fetch_bundle_when_public_enabled() public {
        _change_edit_permission_as_owner(true);
        address sender = address(this);
        _should_add_and_fetch_bundle(sender);
    }

    function test_should_revert_creating_bundle_when_caller_not_owner() public {
        bool openToPublic = cut.openToPublic();
        address sender = address(this);
        uint64[] memory dummyStrategyIds = new uint64[](2);

        vm.expectRevert(
            abi.encodeWithSelector(
                BundleStorage.NoAuthToCreateBundle.selector,
                sender,
                openToPublic
            )
        );
        cut.createBundle(dummyStrategyIds);
    }

    function test_should_revert_creating_bundle_with_unknown_strategy() public {
        _change_edit_permission_as_owner(true);
        (uint256 firstId,,) = _add_dummy_strategies();

        uint64[] memory ids = new uint64[](2);
        ids[0] = uint64(firstId);
        ids[1] = type(uint64).max - 1; // unknownId

        vm.expectRevert();
        cut.createBundle(ids);        
    }

    function test_should_revert_creating_bundle_with_different_triggers_for_strategies() public {
        _change_edit_permission_as_owner(true);
        (uint256 firstId, uint256 secondId, uint256 thirdId) = _add_dummy_strategies();

        uint64[] memory ids = new uint64[](3);
        ids[0] = uint64(firstId);
        ids[1] = uint64(secondId);
        ids[2] = uint64(thirdId); // has different triggers

        vm.expectRevert(
            abi.encodeWithSelector(
                BundleStorage.DiffTriggersInBundle.selector,
                ids
            )
        );
        cut.createBundle(ids);
    }

    function test_should_change_edit_permission() public {
        bool openToPublicBefore = cut.openToPublic();
        _change_edit_permission_as_owner(!openToPublicBefore);
        bool openToPublicAfter = cut.openToPublic();

        assertEq(openToPublicBefore, !openToPublicAfter);
    }

    function test_should_revert_changing_edit_permission_if_caller_not_owner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.changeEditPermission(true);
    }

    function test_should_fetch_paginated_bundles() public {
        // first add 4 bundles
        uint256 counter = 0;
        (uint256 firstId, uint256 secondId,) = _add_dummy_strategies();
        while (counter < 4) {
            uint64[] memory dummyStrategyIds = new uint64[](2);
            dummyStrategyIds[0] = uint64(firstId);
            dummyStrategyIds[1] = uint64(secondId);
            vm.prank(Const.OWNER_ACC);
            cut.createBundle(dummyStrategyIds);
            (firstId, secondId,) = _add_dummy_strategies();
            counter++;
        }

        // fetch first 3 bundles
        StrategyModel.StrategyBundle[] memory bundles = cut.getPaginatedBundles(0, 3);
        assertEq(bundles.length, 3);
        _assertBundles(bundles, 3);

        // fetch more than 4 bundles
        bundles = cut.getPaginatedBundles(0, 6);
        assertEq(bundles.length, 6);
        _assertBundles(bundles, 4);

        // fetch 1 bundle
        bundles = cut.getPaginatedBundles(0, 1);
        assertEq(bundles.length, 1);
        _assertBundles(bundles, 1);

        // fetch exactly 4 bundles
        bundles = cut.getPaginatedBundles(0, 4);
        assertEq(bundles.length, 4);
        _assertBundles(bundles, 4);

        // fetch 2nd page
        bundles = cut.getPaginatedBundles(1, 2);
        assertEq(bundles.length, 2);
        _assertBundles(bundles, 2);

        // fetch non-existent page
        bundles = cut.getPaginatedBundles(4, 2);
        assertEq(bundles.length, 2);
        _assertBundles(bundles, 0);

        // fetch 2nd page with 3 per page
        bundles = cut.getPaginatedBundles(1, 3);
        assertEq(bundles.length, 3);
        _assertBundles(bundles, 1);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertBundles(
        StrategyModel.StrategyBundle[] memory _fetchedBundles,
        uint256 _realSize
    ) internal {
        for (uint256 i = 0; i < _realSize; ++i) {
            assertEq(_fetchedBundles[i].creator, Const.OWNER_ACC);
            assertEq(_fetchedBundles[i].strategyIds.length, 2);
        }
        // empty bundles are returned if the requested count is more than the actual count
        for (uint256 i = _realSize; i < _fetchedBundles.length; ++i) {
            assertEq(_fetchedBundles[i].creator, address(0));
            assertEq(_fetchedBundles[i].strategyIds.length, 0);
        }
    }

    function _should_add_and_fetch_bundle(address _sender) internal {
        (uint256 firstId, uint256 secondId,) = _add_dummy_strategies();
        uint64[] memory dummyStrategyIds = new uint64[](2);
        dummyStrategyIds[0] = uint64(firstId);
        dummyStrategyIds[1] = uint64(secondId);

        uint256 bundleCountBefore = cut.getBundleCount();

        startPrank(_sender);
        vm.expectEmit(true, false, false, false, address(cut));
        emit BundleCreated(bundleCountBefore);
        uint256 bundleId = cut.createBundle(dummyStrategyIds);
        stopPrank();

        uint256 bundleCountAfter = cut.getBundleCount();

        assertEq(bundleCountBefore + 1, bundleCountAfter);
        assertEq(bundleId, bundleCountAfter - 1);

        StrategyModel.StrategyBundle memory bundle = cut.getBundle(bundleId);
        assertEq(bundle.creator, _sender);
        assertEq(bundle.strategyIds.length, dummyStrategyIds.length);
        assertEq(bundle.strategyIds[0], dummyStrategyIds[0]);
        assertEq(bundle.strategyIds[1], dummyStrategyIds[1]);

        uint256 firstStrategyId = cut.getStrategyId(bundleId, 0);
        assertEq(firstStrategyId, dummyStrategyIds[0]);

        uint256 secondStrategyId = cut.getStrategyId(bundleId, 1);
        assertEq(secondStrategyId, dummyStrategyIds[1]);
    }

    function _change_edit_permission_as_owner(bool _isOpenToPublic) internal {
        prank(Const.OWNER_ACC);
        cut.changeEditPermission(_isOpenToPublic);
    }

    function _add_dummy_strategies() internal returns (uint256 firstId, uint256 secondId, uint256 thirdId) {
        bytes4[] memory triggersForFirstAndSecondStrategy = new bytes4[](2);
        triggersForFirstAndSecondStrategy[0] = bytes4(keccak256("First"));
        triggersForFirstAndSecondStrategy[1] = bytes4(keccak256("Second"));
        
        bytes4[] memory actionsIds = new bytes4[](0);
        uint8[][] memory paramMapping = new uint8[][](0);
        bool continuous = true;

        startPrank(Const.OWNER_ACC);
        firstId = strategyStorage.createStrategy("First", triggersForFirstAndSecondStrategy, actionsIds, paramMapping, continuous);
        secondId = strategyStorage.createStrategy("Second", triggersForFirstAndSecondStrategy, actionsIds, paramMapping, continuous);
        thirdId = strategyStorage.createStrategy("Third", new bytes4[](0), actionsIds, paramMapping, continuous);
        stopPrank();
    }
}
