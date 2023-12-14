// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface IRETH {
    function getEthValue(uint256 rethAmount) external view returns (uint256 wethAmount);
    function getRethValue(uint256 wethAmount) external view returns (uint256 rethAmount);
}