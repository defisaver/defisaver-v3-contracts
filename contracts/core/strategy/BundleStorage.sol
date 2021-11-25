// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./StrategyModel.sol";
import "../../auth/AdminAuth.sol";

/// @title BundleStorage - Record of all the Bundles created
contract BundleStorage is StrategyModel, AdminAuth {

    uint256 _bundleCount;
    mapping(uint256 => StrategyBundle) public bundles;
    bool public openToPublic = false;

    error NoAuthToCreateBundle(address,bool);
    event BundleCreated(uint256);

    modifier onlyAuthCreators {
        if (adminVault.owner() != msg.sender && openToPublic == false) {
            revert NoAuthToCreateBundle(msg.sender, openToPublic);
        }

        _;
    }

    function createBundle(
        uint64[] memory _strategyIds
    ) public onlyAuthCreators returns (uint256) {
        uint256 bundleCount = _bundleCount;

        bundles[_bundleCount++] = StrategyBundle({
            creator: msg.sender,
            strategyIds: _strategyIds
        });

        emit BundleCreated(bundleCount);

        return bundleCount;
    }

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
        return _bundleCount;
    }

    function getPaginatedBundles(uint _page, uint _perPage) public view returns (StrategyBundle[] memory) {
        StrategyBundle[] memory bundlesPerPage = new StrategyBundle[](_perPage);
        uint256 bundleCount = _bundleCount;
        uint start = _page * _perPage;
        uint end = start + _perPage;

        end = (end > bundleCount) ? bundleCount : end;

        uint count = 0;
        for (uint i = start; i < end; i++) {
            bundlesPerPage[count] = bundles[i];
            count++;
        }

        return bundlesPerPage;
    }

}