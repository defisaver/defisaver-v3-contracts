// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IAddressesRegistry {
    function CCR() external view returns (uint256);
    function SCR() external view returns (uint256);
    function MCR() external view returns (uint256);
    function LIQUIDATION_PENALTY_SP() external view returns (uint256);
    function LIQUIDATION_PENALTY_REDISTRIBUTION() external view returns (uint256);
    function troveNFT() external view returns (address);
    function collToken() external view returns (address);
    function borrowerOperations() external view returns (address);
    function troveManager() external view returns (address);
    function stabilityPool() external view returns (address);
    function sortedTroves() external view returns (address);
    function collSurplusPool() external view returns (address);
    function hintHelpers() external view returns (address);
    function priceFeed() external view returns (address);
}
