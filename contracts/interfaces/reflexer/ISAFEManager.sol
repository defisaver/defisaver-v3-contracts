// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract ISAFEManager {
    function lastSAFEID(address) public view virtual returns (uint256);
    function safeCan(address, uint256, address) public view virtual returns (uint256);
    function collateralTypes(uint256) public view virtual returns (bytes32);
    function ownsSAFE(uint256) public view virtual returns (address);
    function safes(uint256) public view virtual returns (address);
    function safeEngine() public view virtual returns (address);
    function openSAFE(bytes32, address) public virtual returns (uint256);
    function transferSAFEOwnership(uint256, address) public virtual;
    function allowSAFE(uint256, address, uint256) public virtual;
    function handlerAllowed(address, uint256) public virtual;
    function modifySAFECollateralization(uint256, int256, int256) public virtual;
    function transferCollateral(uint256, address, uint256) public virtual;
    function transferInternalCoins(uint256, address, uint256) public virtual;
    function quitSystem(uint256, address) public virtual;
    function enterSystem(address, uint256) public virtual;
    function moveSAFE(uint256, uint256) public virtual;
    function safeCount(address) public view virtual returns (uint256);
    function safei() public view virtual returns (uint256);
    function protectSAFE(uint256, address, address) public virtual;
}
