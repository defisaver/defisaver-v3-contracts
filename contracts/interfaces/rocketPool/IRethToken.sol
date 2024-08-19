// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IRethToken {

    // Burn rETH for ETH
    function burn(uint256 _rethAmount) external;

    // Returns the rETH balance of an account
    function balanceOf(address account) external view returns (uint256);
}
