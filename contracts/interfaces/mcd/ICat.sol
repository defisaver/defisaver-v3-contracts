// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

abstract contract ICat {
    struct Ilk {
        address flip;  // Liquidator
        uint256 chop;  // Liquidation Penalty   [ray]
        uint256 lump;  // Liquidation Quantity  [wad]
    }

    mapping (bytes32 => Ilk) public ilks;
}
