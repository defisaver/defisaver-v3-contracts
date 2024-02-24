// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface IAGG {
    function rate() external view returns (uint256);
    function rate(address) external view returns (uint256);
    function rate0() external view returns (uint256);
    function target_debt_fraction() external view returns (uint256);
    function sigma() external view returns (int256);
    function peg_keepers(uint256) external view returns (address); 
}