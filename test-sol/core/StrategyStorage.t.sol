// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { StrategyStorage } from "../../contracts/core/strategy/StrategyStorage.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { AdminAuth } from "../../contracts/auth/AdminAuth.sol";

import { Strings } from "../utils/library/Strings.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import { Const } from "../Const.sol";

contract TestCore_StrategyStorage is BaseTest {

    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    StrategyStorage cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    event StrategyCreated(uint256 indexed strategyId);

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        cut = new StrategyStorage();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_open_to_public_should_be_false_by_default() public {
        bool openToPublic = cut.openToPublic();
        assertFalse(openToPublic);
    }

    function test_should_add_and_fetch_strategy_as_owner() public {
        address sender = Const.OWNER_ACC;
        _should_add_and_fetch_strategy(sender);
    }

    function test_should_add_and_fetch_strategy_when_public_enabled() public {
        _change_edit_permission_as_owner(true);
        address sender = address(this);
        _should_add_and_fetch_strategy(sender);
    }

    function test_should_revert_creating_strategy_when_caller_not_owner() public {
        bool openToPublic = cut.openToPublic();
        address sender = address(this);

        vm.expectRevert(
            abi.encodeWithSelector(
                StrategyStorage.NoAuthToCreateStrategy.selector,
                sender,
                openToPublic
            )
        );
        cut.createStrategy("Test", new bytes4[](0), new bytes4[](0), new uint8[][](0), true);
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

    function test_should_fetch_paginated_strategies() public {
        // first add 4 strategies
        startPrank(Const.OWNER_ACC);
        cut.createStrategy("Test1", new bytes4[](0), new bytes4[](0), new uint8[][](0), true);
        cut.createStrategy("Test2", new bytes4[](0), new bytes4[](0), new uint8[][](0), true);
        cut.createStrategy("Test3", new bytes4[](0), new bytes4[](0), new uint8[][](0), true);
        cut.createStrategy("Test4", new bytes4[](0), new bytes4[](0), new uint8[][](0), true);
        stopPrank();

        // fetch first 3 strategies
        StrategyModel.Strategy[] memory strategies = cut.getPaginatedStrategies(0, 3);
        assertEq(strategies.length, 3);
        _assertStrategies(strategies, 3, 0);

        // fetch more than 4 strategies
        strategies = cut.getPaginatedStrategies(0, 6);
        assertEq(strategies.length, 6);
        _assertStrategies(strategies, 4, 0);

        // fetch 1 strategy
        strategies = cut.getPaginatedStrategies(0, 1);
        assertEq(strategies.length, 1);
        _assertStrategies(strategies, 1, 0);

        // fetch exactly 4 strategies
        strategies = cut.getPaginatedStrategies(0, 4);
        assertEq(strategies.length, 4);
        _assertStrategies(strategies, 4, 0);

        // fetch 2nd page with 2 per page
        strategies = cut.getPaginatedStrategies(1, 2);
        assertEq(strategies.length, 2);
        _assertStrategies(strategies, 2, 2);

        // fetch non-existent page
        strategies = cut.getPaginatedStrategies(4, 2);
        assertEq(strategies.length, 2);
        _assertStrategies(strategies, 0, 0);

        // fetch 2nd page with 3 per page
        strategies = cut.getPaginatedStrategies(1, 3);
        assertEq(strategies.length, 3);
        _assertStrategies(strategies, 1, 3);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertStrategies(
        StrategyModel.Strategy[] memory _fetchedStrategies,
        uint256 _realSize,
        uint256 _offset
    ) internal {
        for (uint256 i = 0; i < _realSize; ++i) {
            assertTrue(
                Strings.equal(
                    _fetchedStrategies[i].name,
                    string(abi.encodePacked("Test", Strings.toString(i + 1 + _offset)))
                )
            );
            assertEq(_fetchedStrategies[i].creator, Const.OWNER_ACC);
        }
        // empty strategies are returned if the requested count is more than the actual count
        for (uint256 i = _realSize; i < _fetchedStrategies.length; ++i) {
            assertTrue(Strings.equal(_fetchedStrategies[i].name, ""));
            assertEq(_fetchedStrategies[i].creator, address(0));
        }
    }

    function _should_add_and_fetch_strategy(address _sender) internal {
        uint256 strategyCountBefore = cut.getStrategyCount();

        vm.expectEmit(true, false, false, false, address(cut));
        emit StrategyCreated(strategyCountBefore);
        startPrank(_sender);
        uint256 strategyId = cut.createStrategy("Test1", new bytes4[](0), new bytes4[](0), new uint8[][](0), true);
        stopPrank();

        uint256 strategyCountAfter = cut.getStrategyCount();

        assertEq(strategyCountBefore + 1, strategyCountAfter);
        assertEq(strategyId, strategyCountBefore);

        StrategyModel.Strategy memory strategy = cut.getStrategy(strategyId);
        assertTrue(Strings.equal(strategy.name, "Test1"));
        assertEq(strategy.creator, _sender);
    }

    function _change_edit_permission_as_owner(bool _isOpenToPublic) internal {
        prank(Const.OWNER_ACC);
        cut.changeEditPermission(_isOpenToPublic);
    }
}
