// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "./IVat.sol";
import "./IGem.sol";

abstract contract IDaiJoin {
    function vat() public virtual returns (IVat);
    function dai() public virtual returns (IGem);
    function join(address, uint) public virtual payable;
    function exit(address, uint) public virtual;
}
