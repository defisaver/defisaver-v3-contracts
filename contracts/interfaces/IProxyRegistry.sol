// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract IProxyRegistry {
    function proxies(address _owner) public virtual view returns (address);
    function build(address) public virtual returns (address);
}
