// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IPendleYieldToken {
    function redeemPY(address receiver) external returns (uint256 amountSyOut);
    function isExpired() external view returns (bool);
}