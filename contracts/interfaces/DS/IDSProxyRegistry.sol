// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IDSProxyRegistry {
    function proxies(address _owner) external view returns (address);
    function build(address) external returns (address);
}
