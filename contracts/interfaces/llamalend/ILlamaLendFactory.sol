// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;


interface ILlamaLendFactory {
    function controllers(uint256) external view returns (address);
}