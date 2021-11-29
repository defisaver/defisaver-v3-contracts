// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./StrategyModel.sol";
import "../../auth/AdminAuth.sol";
import "../DFSRegistry.sol";
import "./StrategyStorage.sol";

/// @title BundleStorage - Record of all the Bundles created
contract BundleStorage is StrategyModel, AdminAuth {

    StrategyBundle[] public bundles;
    bool public openToPublic = false;

    bytes4 constant STRATEGY_STORAGE_ID = bytes4(keccak256("StrategyStorage"));

    address public constant REGISTRY_ADDR = 0xD5cec8F03f803A74B60A7603Ed13556279376b09;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    error NoAuthToCreateBundle(address,bool);
    error DiffTriggersInBundle(uint64[]);

    event BundleCreated(uint256);

    modifier onlyAuthCreators {
        if (adminVault.owner() != msg.sender && openToPublic == false) {
            revert NoAuthToCreateBundle(msg.sender, openToPublic);
        }

        _;
    }

    /// @dev Checks if the triggers in strategies are the same (order also relevant)
    modifier sameTriggers(uint64[] memory _strategyIds) {
        // TODO: hard code the addr later for gas savings
        address strategyStorageAddr = registry.getAddr(STRATEGY_STORAGE_ID);
        Strategy memory firstStrategy = StrategyStorage(strategyStorageAddr).getStrategy(_strategyIds[0]);

        for (uint256 i = 1; i < _strategyIds.length; ++i) {
            Strategy memory s = StrategyStorage(strategyStorageAddr).getStrategy(_strategyIds[i]);

            if (keccak256(abi.encode(firstStrategy.triggerIds)) != keccak256(abi.encode(s.triggerIds))) {
                revert DiffTriggersInBundle(_strategyIds);
            }
        }

        _;
    }

    /// @notice Adds a new bundle to array
    /// @dev Can only be called by auth addresses if it's not open to public
    /// @dev Strategies need to have the same number of triggers and ids exists
    /// @param _strategyIds Array of strategyIds that go into a bundle
    function createBundle(
        uint64[] memory _strategyIds
    ) public onlyAuthCreators sameTriggers(_strategyIds) returns (uint256) {

        bundles.push(StrategyBundle({
            creator: msg.sender,
            strategyIds: _strategyIds
        }));

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

    function getBundle(uint _bundleId) public view returns (StrategyBundle memory) {
        return bundles[_bundleId];
    }
    function getBundleCount() public view returns (uint256) {
        return bundles.length;
    }

    function getPaginatedBundles(uint _page, uint _perPage) public view returns (StrategyBundle[] memory) {
        StrategyBundle[] memory bundlesPerPage = new StrategyBundle[](_perPage);
        uint start = _page * _perPage;
        uint end = start + _perPage;

        end = (end > bundles.length) ? bundles.length : end;

        uint count = 0;
        for (uint i = start; i < end; i++) {
            bundlesPerPage[count] = bundles[i];
            count++;
        }

        return bundlesPerPage;
    }

}