// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IVat } from "./IVat.sol";
import { IGem } from "./IGem.sol";

abstract contract ICdpRegistry {
    function open(
        bytes32 ilk,
        address usr
    ) public virtual returns (uint256);

    function cdps(bytes32, address) virtual public view returns (uint256);
    function owns(uint) virtual public view returns (address);
    function ilks(uint) virtual public view returns (bytes32);

}
