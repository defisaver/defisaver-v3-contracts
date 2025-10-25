// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IDSProxyRegistry {
    function proxies(address _owner) public view virtual returns (address);
    function build(address) public virtual returns (address);
}
