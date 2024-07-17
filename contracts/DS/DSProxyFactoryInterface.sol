// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DSProxy } from "./DSProxy.sol";

abstract contract DSProxyFactoryInterface {
    function build(address owner) public virtual returns (DSProxy proxy);
    function build() public virtual returns (DSProxy proxy);
}
