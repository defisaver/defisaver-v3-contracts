// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IPipInterface } from "./IPipInterface.sol";

abstract contract ISpotter {
    struct Ilk {
        IPipInterface pip;
        uint256 mat;
    }

    mapping(bytes32 => Ilk) public ilks;

    uint256 public par;
}
