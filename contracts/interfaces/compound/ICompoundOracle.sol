// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract ICompoundOracle {
    function getUnderlyingPrice(address cToken) external view virtual returns (uint);
}
