// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract ICometExt {
    function allow(address manager, bool isAllowed) external virtual;
    function collateralBalanceOf(address account, address asset) external view virtual returns (uint128);
    function allowance(address owner, address spender) external view virtual returns (uint256);
}
