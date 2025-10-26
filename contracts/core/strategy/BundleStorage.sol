// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { StrategyModel } from "./StrategyModel.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { StrategyStorage } from "./StrategyStorage.sol";
import { CoreHelper } from "../helpers/CoreHelper.sol";

/// @title BundleStorage - Record of all the Bundles created
contract BundleStorage is StrategyModel, AdminAuth, CoreHelper {
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    StrategyBundle[] public bundles;
    bool public openToPublic = false;

    error NoAuthToCreateBundle(address, bool);
    error DiffTriggersInBundle(uint64[]);

    event BundleCreated(uint256 indexed bundleId);

    modifier onlyAuthCreators() {
        if (adminVault.owner() != msg.sender && openToPublic == false) {
            revert NoAuthToCreateBundle(msg.sender, openToPublic);
        }

        _;
    }

    /// @dev Checks if the triggers in strategies are the same (order also relevant)
    /// @dev If the caller is not owner we do additional checks, we skip those checks for gas savings
    modifier sameTriggers(uint64[] memory _strategyIds) {
        if (msg.sender != adminVault.owner()) {
            Strategy memory firstStrategy = StrategyStorage(STRATEGY_STORAGE_ADDR).getStrategy(_strategyIds[0]);

            bytes32 firstStrategyTriggerHash = keccak256(abi.encode(firstStrategy.triggerIds));

            for (uint256 i = 1; i < _strategyIds.length; ++i) {
                Strategy memory s = StrategyStorage(STRATEGY_STORAGE_ADDR).getStrategy(_strategyIds[i]);

                if (firstStrategyTriggerHash != keccak256(abi.encode(s.triggerIds))) {
                    revert DiffTriggersInBundle(_strategyIds);
                }
            }
        }

        _;
    }

    /// @notice Adds a new bundle to array
    /// @dev Can only be called by auth addresses if it's not open to public
    /// @dev Strategies need to have the same number of triggers and ids exists
    /// @param _strategyIds Array of strategyIds that go into a bundle
    function createBundle(uint64[] memory _strategyIds)
        public
        onlyAuthCreators
        sameTriggers(_strategyIds)
        returns (uint256)
    {
        bundles.push(StrategyBundle({ creator: msg.sender, strategyIds: _strategyIds }));

        emit BundleCreated(bundles.length - 1);

        return bundles.length - 1;
    }

    /// @notice Switch to determine if bundles can be created by anyone
    /// @dev Callable only by the owner
    /// @param _openToPublic Flag if true anyone can create bundles
    function changeEditPermission(bool _openToPublic) public onlyOwner {
        openToPublic = _openToPublic;
    }

    ////////////////////////////// VIEW METHODS /////////////////////////////////

    function getStrategyId(uint256 _bundleId, uint256 _strategyIndex) public view returns (uint256) {
        return bundles[_bundleId].strategyIds[_strategyIndex];
    }

    function getBundle(uint256 _bundleId) public view returns (StrategyBundle memory) {
        return bundles[_bundleId];
    }

    function getBundleCount() public view returns (uint256) {
        return bundles.length;
    }

    function getPaginatedBundles(uint256 _page, uint256 _perPage) public view returns (StrategyBundle[] memory) {
        StrategyBundle[] memory bundlesPerPage = new StrategyBundle[](_perPage);
        uint256 start = _page * _perPage;
        uint256 end = start + _perPage;

        end = (end > bundles.length) ? bundles.length : end;

        uint256 count = 0;
        for (uint256 i = start; i < end; i++) {
            bundlesPerPage[count] = bundles[i];
            count++;
        }

        return bundlesPerPage;
    }
}
