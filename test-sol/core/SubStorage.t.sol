// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { SubStorage } from "../../contracts/core/strategy/SubStorage.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { AdminAuth } from "../../contracts/auth/AdminAuth.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { Const } from "../Const.sol";

contract TestCore_SubStorage is SubStorage, BaseTest {

    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SubStorage cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        cut = new SubStorage();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_fail_to_subscribe_with_strategy_id_out_of_range() public {
        bool isBundle = false;
        _subscribe_with_invalid_strategy_or_bundle_id(isBundle);
    }

    function test_should_fail_to_subscribe_with_bundle_id_out_of_range() public {
        bool isBundle = true;
        _subscribe_with_invalid_strategy_or_bundle_id(isBundle);        
    }

    function test_should_subscribe_to_strategy() public {
        bool isBundle = false;
        _subscribe(isBundle);
    }

    function test_should_subscribe_to_bundle() public {
        bool isBundle = true;
        _subscribe(isBundle);
    }

    function test_should_fail_to_update_sub_data_with_strategy_id_out_of_range() public {
        bool isBundle = false;
        _update_sub_data_with_invalid_strategy_or_bundle_id(isBundle);
    }

    function test_should_fail_to_update_sub_data_with_bundle_id_out_of_range() public {
        bool isBundle = true;
        _update_sub_data_with_invalid_strategy_or_bundle_id(isBundle);
    }

    function test_should_fail_to_update_sub_data_when_not_owner() public {
        uint256 subId = _createDummySub(bob);

        StrategyModel.StrategySub memory updatedSub = StrategyModel.StrategySub({
            strategyOrBundleId: 0,
            isBundle: true,
            triggerData: new bytes[](0),
            subData: new bytes32[](0)
        });
        vm.expectRevert(
            abi.encodeWithSelector(
                SenderNotSubOwnerError.selector,
                address(this),
                subId
            )
        );
        cut.updateSubData(subId, updatedSub);
    }

    function test_should_update_sub_data() public {
        uint256 subId = _createDummySub(address(this));

        StrategyModel.StrategySub memory updatedSub = StrategyModel.StrategySub({
            strategyOrBundleId: 1,
            isBundle: true,
            triggerData: new bytes[](0),
            subData: new bytes32[](0)
        });
        bytes32 expectedUpdatedSubHash = keccak256(abi.encode(updatedSub));

        vm.expectEmit(true, true, false, true, address(cut));
        emit UpdateData(subId, expectedUpdatedSubHash, updatedSub);
        cut.updateSubData(subId, updatedSub);

        StrategyModel.StoredSubData memory storedSub = cut.getSub(subId);
        assertEq(uint256(storedSub.strategySubHash), uint256(expectedUpdatedSubHash));
        assertEq(address(storedSub.walletAddr), address(this));
        assertEq(storedSub.isEnabled, true);
    }

    function test_should_fail_to_active_sub_when_not_owner() public {
        uint256 subId = _createDummySub(bob);

        vm.expectRevert(
            abi.encodeWithSelector(
                SenderNotSubOwnerError.selector,
                address(this),
                subId
            )
        );
        cut.activateSub(subId);
    }

    function test_should_fail_to_deactivate_sub_when_not_owner() public {
        uint256 subId = _createDummySub(bob);

        vm.expectRevert(
            abi.encodeWithSelector(
                SenderNotSubOwnerError.selector,
                address(this),
                subId
            )
        );
        cut.deactivateSub(subId);
    }

    function test_should_deactivate_sub_than_activate_again() public {
        uint256 subId = _createDummySub(address(this));

        vm.expectEmit(true, false, false, false, address(cut));
        emit DeactivateSub(subId);
        cut.deactivateSub(subId);

        StrategyModel.StoredSubData memory storedSub = cut.getSub(subId);
        assertEq(storedSub.isEnabled, false);

        vm.expectEmit(true, false, false, false, address(cut));
        emit ActivateSub(subId);
        cut.activateSub(subId);

        storedSub = cut.getSub(subId);
        assertEq(storedSub.isEnabled, true);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _createDummySub(address _sender) internal returns(uint256 subId) {
        StrategyModel.StrategySub memory sub = StrategyModel.StrategySub({
            strategyOrBundleId: 0,
            isBundle: true,
            triggerData: new bytes[](0),
            subData: new bytes32[](0)
        });

        prank(_sender);
        subId = cut.subscribeToStrategy(sub);
    }

    function _subscribe(bool _isBundle) internal {
        uint64 strategyOrBundleId = 1;

        StrategyModel.StrategySub memory sub = StrategyModel.StrategySub({
            strategyOrBundleId: strategyOrBundleId,
            isBundle: _isBundle,
            triggerData: new bytes[](0),
            subData: new bytes32[](0)
        });

        bytes32 expectedStoredSubHash = keccak256(abi.encode(sub));
        uint256 subCountBefore = cut.getSubsCount();

        vm.expectEmit(true, true, true, true, address(cut));
        emit Subscribe(subCountBefore, address(this), expectedStoredSubHash, sub);
        uint256 subId = cut.subscribeToStrategy(sub);
        
        uint256 subCountAfter = cut.getSubsCount();

        assertEq(subCountBefore + 1, subCountAfter);
        assertEq(subId, subCountAfter - 1);

        StrategyModel.StoredSubData memory storedSub = cut.getSub(subId);
        assertEq(address(storedSub.walletAddr), address(this));
        assertEq(storedSub.isEnabled, true);
        assertEq(uint256(storedSub.strategySubHash), uint256(expectedStoredSubHash));
    }

    function _subscribe_with_invalid_strategy_or_bundle_id(bool _isBundle) internal {
        uint64 strategyOrBundleIdOutOfRange = type(uint64).max - 1;

        StrategyModel.StrategySub memory invalidSub = StrategyModel.StrategySub({
            strategyOrBundleId: strategyOrBundleIdOutOfRange,
            isBundle: _isBundle,
            triggerData: new bytes[](0),
            subData: new bytes32[](0)
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                SubIdOutOfRange.selector,
                uint256(strategyOrBundleIdOutOfRange),
                _isBundle
            )
        );
        cut.subscribeToStrategy(invalidSub);
    }

    function _update_sub_data_with_invalid_strategy_or_bundle_id(bool _isBundle) internal {
        uint256 subId = _createDummySub(address(this));
        uint64 invalidStrategyOrBundleId = type(uint64).max - 1;

        StrategyModel.StrategySub memory updatedSub = StrategyModel.StrategySub({
            strategyOrBundleId: invalidStrategyOrBundleId,
            isBundle: _isBundle,
            triggerData: new bytes[](0),
            subData: new bytes32[](0)
        });
        vm.expectRevert(
            abi.encodeWithSelector(
                SubIdOutOfRange.selector,
                invalidStrategyOrBundleId,
                _isBundle
            )
        );
        cut.updateSubData(subId, updatedSub);
    }
}
