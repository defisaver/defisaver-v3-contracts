// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { StrategyModel } from "../../core/strategy/StrategyModel.sol";

interface IStrategyStorage {
    function openToPublic() external view returns (bool);
    function createStrategy(
        string memory _name,
        bytes4[] memory _triggerIds,
        bytes4[] memory _actionIds,
        uint8[][] memory _paramMapping,
        bool _continuous
    ) external returns (uint256);
    function changeEditPermission(bool _openToPublic) external;
    function getStrategy(uint256 _strategyId) external view returns (StrategyModel.Strategy memory);
    function getStrategyCount() external view returns (uint256);
    function getPaginatedStrategies(uint256 _page, uint256 _perPage)
        external
        view
        returns (StrategyModel.Strategy[] memory);
}
