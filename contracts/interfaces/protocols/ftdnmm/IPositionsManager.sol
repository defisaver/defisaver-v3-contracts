// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IConfigRegistry } from "./IConfigRegistry.sol";
import { IAccountValuesLens } from "./IAccountValuesLens.sol";

/// @title Minimal interface for the ftDNMM PositionsManager (cross-margin money market)
interface IPositionsManager {
    function deposit(address asset, uint256 amt) external;
    function withdraw(address asset, uint256 amt) external;
    function borrow(address asset, uint256 amt) external;
    function repay(address asset, uint256 amt) external;

    function getBalance(address user, address token)
        external
        view
        returns (uint256 avail, uint256 hold);
    function collateral(address user, address asset)
        external
        view
        returns (
            uint256 avail,
            uint256 hold,
            uint40 lastT,
            uint32 lastSettledEpoch,
            uint256 openSupplyTime
        );
    function debtShares(address user, address asset) external view returns (uint256);
    function totalDebtShares(address asset) external view returns (uint256);
    function astate(address asset)
        external
        view
        returns (
            uint256 borrowIndexWad,
            uint256 cash,
            uint256 borrows,
            uint256 totalSupplied,
            uint256 reserves,
            uint256 totalSuppliedTime,
            uint40 lastAccrual,
            uint32 epoch
        );
    function userCollateralAssets(address user) external view returns (address[] memory);
    function userDebtAssets(address user) external view returns (address[] memory);
    function config() external view returns (IConfigRegistry);
    function valuesLens() external view returns (IAccountValuesLens);
}
