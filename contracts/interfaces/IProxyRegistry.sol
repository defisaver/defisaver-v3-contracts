// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract IProxyRegistry {
    function proxies(address _owner) public virtual view returns (address);
    function build(address) public virtual returns (address);
}
