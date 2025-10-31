// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ICometExt {
    function allow(address manager, bool isAllowed) external;
    function collateralBalanceOf(address account, address asset) external view returns (uint128);
    function allowance(address owner, address spender) external view returns (uint256);
}
