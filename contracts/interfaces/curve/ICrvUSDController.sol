// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface ICrvUSDController {
    function amm() external view returns (address);
    function monetary_policy() external view returns (address);
    function health_calculator(address, int256, int256, bool, uint256) external view returns (int256);
    function health_calculator(address, int256, int256, bool) external view returns (int256);
    function health(address) external view returns (int256);
    function health(address, bool) external view returns (int256);
    function min_collateral(uint256, uint256) external view returns (uint256);
    function max_borrowable(uint256, uint256) external view returns (uint256);
    function calculate_debt_n1(uint256, uint256, uint256) external view returns (int256);
}

