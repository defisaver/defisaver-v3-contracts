// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IAddressesRegistry {
    function collToken() external view returns (address);
    function borrowerOperations() external view returns (address);
    function troveManager() external view returns (address);
    function stabilityPool() external view returns (address);
    function sortedTroves() external view returns (address);
    function collSurplusPool() external view returns (address);
}
