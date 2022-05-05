// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract ICompoundOracle {
    function getUnderlyingPrice(address cToken) external view virtual returns (uint);
}
