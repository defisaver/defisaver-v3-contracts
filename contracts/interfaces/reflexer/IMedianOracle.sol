// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract IMedianOracle {
    function read() external virtual view returns (uint256);
}
