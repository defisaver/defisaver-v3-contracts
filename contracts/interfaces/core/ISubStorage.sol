// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { StrategyModel } from "../../core/strategy/StrategyModel.sol";

interface ISubStorage {
    function subscribeToStrategy(StrategyModel.StrategySub memory _sub) external returns (uint256);
    function updateSubData(uint256 _subId, StrategyModel.StrategySub calldata _sub) external;
    function activateSub(uint256 _subId) external;
    function deactivateSub(uint256 _subId) external;
    function getSub(uint256 _subId) external view returns (StrategyModel.StoredSubData memory);
    function getSubsCount() external view returns (uint256);
}
