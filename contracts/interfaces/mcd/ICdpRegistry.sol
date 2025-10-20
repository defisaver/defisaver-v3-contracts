// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IVat } from "./IVat.sol";
import { IGem } from "./IGem.sol";

abstract contract ICdpRegistry {
    function open(bytes32 ilk, address usr) public virtual returns (uint256);

    function cdps(bytes32, address) public view virtual returns (uint256);
    function owns(uint256) public view virtual returns (address);
    function ilks(uint256) public view virtual returns (bytes32);
}
