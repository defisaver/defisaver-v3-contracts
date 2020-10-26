// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract IJug {
    struct Ilk {
        uint256 duty;
        uint256  rho;
    }

    mapping (bytes32 => Ilk) public ilks;

    function drip(bytes32) public virtual returns (uint);
}
