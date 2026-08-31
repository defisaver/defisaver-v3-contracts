// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { CreateSub } from "../../contracts/actions/utils/CreateSub.sol";
import { SubStorage } from "../../contracts/core/strategy/SubStorage.sol";
import { SemiContinuousTracker } from "../../contracts/core/strategy/SemiContinuousTracker.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { IDFSRegistry } from "../../contracts/interfaces/core/IDFSRegistry.sol";
import { DFSIds } from "../../contracts/utils/DFSIds.sol";

import { ActionsUtils } from "./ActionsUtils.sol";
import { RegistryUtils } from "./RegistryUtils.sol";
import { BaseTest } from "./BaseTest.sol";
import { SmartWallet } from "./SmartWallet.sol";

/// @notice Base for the subscription action suites (ToggleSub, UpdateSub).
contract SubActionsBase is ActionsUtils, RegistryUtils, BaseTest {
    /// @dev Existing mainnet bundle every sub in these suites points at.
    uint64 internal constant BUNDLE_ID = 10;

    /// @dev Seed of the sub created by _subscribe.
    uint256 internal constant INITIAL_SEED = 1;

    SubStorage internal subStorage;
    CreateSub internal createSub;
    SemiContinuousTracker internal tracker;
    address internal strategyExecutor;

    /// @dev Deploys the sub plumbing and registers the tracker, which both actions read from the
    ///      registry. Call from the suite's setUp after forking.
    function _setUpSubActions() internal {
        subStorage = SubStorage(SUB_STORAGE_ADDR);
        createSub = new CreateSub();

        tracker = new SemiContinuousTracker();
        redeploy("SemiContinuousTracker", address(tracker));

        strategyExecutor = IDFSRegistry(REGISTRY_ADDR).getAddr(DFSIds.STRATEGY_EXECUTOR);
        assertTrue(strategyExecutor != address(0));
    }

    /// @dev Subscribes the wallet to an existing mainnet bundle through the CreateSub action.
    function _subscribe(SmartWallet _wallet) internal returns (uint256 newSubId) {
        newSubId = subStorage.getSubsCount();

        _wallet.execute(
            address(createSub),
            executeActionCalldata(createSubEncode(_bundleSub(INITIAL_SEED)), false),
            0
        );
    }

    /// @dev Sub struct pointing at BUNDLE_ID. The trigger/sub payloads are never evaluated here,
    ///      the seed only makes distinct subs distinguishable by their stored hash.
    function _bundleSub(uint256 _seed)
        internal
        pure
        returns (StrategyModel.StrategySub memory newSub)
    {
        bytes[] memory triggerData = new bytes[](1);
        triggerData[0] = abi.encode(_seed);

        bytes32[] memory subDataEncoded = new bytes32[](1);
        subDataEncoded[0] = bytes32(_seed);

        newSub = StrategyModel.StrategySub({
            strategyOrBundleId: BUNDLE_ID,
            isBundle: true,
            triggerData: triggerData,
            subData: subDataEncoded
        });
    }

    /// @dev Puts a sub into semi-continuous execution the way production does: the registered
    ///      StrategyExecutor approves the start, then the owner wallet starts it.
    function _startExecution(uint256 _subId) internal {
        prank(strategyExecutor);
        tracker.approveStartOfExecution(_subId);

        prank(address(subStorage.getSub(_subId).walletAddr));
        tracker.startExecution(_subId);
    }
}
