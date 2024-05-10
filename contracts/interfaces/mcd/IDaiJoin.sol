// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IVat } from "./IVat.sol";
import { IGem } from "./IGem.sol";

abstract contract IDaiJoin {
    function vat() public virtual returns (IVat);
    function dai() public virtual returns (IGem);
    function join(address, uint) public virtual payable;
    function exit(address, uint) public virtual;
}
