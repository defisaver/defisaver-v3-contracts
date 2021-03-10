// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract IMedianOracle {
    function read() external virtual view returns (uint256);
}
