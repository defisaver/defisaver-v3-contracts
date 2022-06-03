// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

abstract contract OVM_GasPriceOracle {
    function getL1Fee(bytes memory _data) public virtual view returns (uint256);
    function getL1GasUsed(bytes memory _data) public virtual view returns (uint256);
}