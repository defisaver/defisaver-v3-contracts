// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IRestakeManager {
    function depositETH() external payable;
    function renzoOracle() external view returns (address);
    function calculateTVLs() external view returns (uint256[][] memory, uint256[] memory, uint256);
}
