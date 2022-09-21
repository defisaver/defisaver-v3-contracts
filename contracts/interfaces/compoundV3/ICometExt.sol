// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract ICometExt {
    function allow(address manager, bool isAllowed) virtual external;
    function collateralBalanceOf(address account, address asset) virtual external view returns (uint128);
    function allowance(address owner, address spender) virtual external view returns (uint256);
}