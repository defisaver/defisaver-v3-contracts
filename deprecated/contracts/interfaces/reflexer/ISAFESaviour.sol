// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract ISAFESaviour {
    function deposit(uint256 safeID, uint256 lpTokenAmount) public virtual;
    function withdraw(uint256 safeID, uint256 lpTokenAmount, address dst) public virtual;
    function lpToken() public view virtual returns (address);
    function lpTokenCover(address) public view virtual returns (uint256);
    function getReserves(uint256, address) public virtual;
}
