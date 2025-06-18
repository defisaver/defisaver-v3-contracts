// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

interface IPendleYieldToken {
    function redeemPY(address receiver) external returns (uint256 amountSyOut);
    function isExpired() external view returns (bool);
}