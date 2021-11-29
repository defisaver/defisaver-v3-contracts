// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
abstract contract ISAFESaviour {
    function deposit(uint256 safeID, uint256 lpTokenAmount) virtual public;
    function withdraw(uint256 safeID, uint256 lpTokenAmount, address dst) virtual public;
    function lpToken() virtual public view returns (address);
    function lpTokenCover(address) virtual public view returns (uint256);
    function getReserves(uint256, address) virtual public;
}