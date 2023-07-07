// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface ILSVProfitTracker {
    function supply(address token, uint256 amount) external;
    function borrow(uint256 amount) external;
    function payback(uint256 amount) external;
    function withdraw(address token, uint256 amount) external returns (uint256 feeAmount);
    function unrealisedProfit(address user) external returns (int256);
}