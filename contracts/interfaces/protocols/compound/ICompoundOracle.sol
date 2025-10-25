// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ICompoundOracle {
    function getUnderlyingPrice(address cToken) external view returns (uint256);
}
