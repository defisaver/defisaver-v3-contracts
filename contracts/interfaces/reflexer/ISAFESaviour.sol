// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
abstract contract ISAFESaviour {
    function deposit(uint256 safeID, uint256 lpTokenAmount) virtual public;
    function withdraw(uint256 safeID, uint256 lpTokenAmount, address dst) virtual public;
    function lpToken() virtual public view returns (address);
}