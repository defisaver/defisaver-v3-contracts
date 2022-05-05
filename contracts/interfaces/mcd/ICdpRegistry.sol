// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./IVat.sol";
import "./IGem.sol";

abstract contract ICdpRegistry {
    function open(
        bytes32 ilk,
        address usr
    ) public virtual returns (uint256);

    function cdps(bytes32, address) virtual public view returns (uint256);
    function owns(uint) virtual public view returns (address);
    function ilks(uint) virtual public view returns (bytes32);

}
