// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract ICompoundOracle {
    function getUnderlyingPrice(address cToken) external view virtual returns (uint);
}
