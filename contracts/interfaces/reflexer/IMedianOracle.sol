// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IMedianOracle {
    function read() external virtual view returns (uint256);
}
