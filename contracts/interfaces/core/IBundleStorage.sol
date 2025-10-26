// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { StrategyModel } from "../../core/strategy/StrategyModel.sol";

interface IBundleStorage {
    function openToPublic() external view returns (bool);
    function createBundle(uint64[] memory _strategyIds) external returns (uint256);
    function changeEditPermission(bool _openToPublic) external;
    function getStrategyId(uint256 _bundleId, uint256 _strategyIndex)
        external
        view
        returns (uint256);
    function getBundle(uint256 _bundleId)
        external
        view
        returns (StrategyModel.StrategyBundle memory);
    function getBundleCount() external view returns (uint256);
    function getPaginatedBundles(uint256 _page, uint256 _perPage)
        external
        view
        returns (StrategyModel.StrategyBundle[] memory);
}
