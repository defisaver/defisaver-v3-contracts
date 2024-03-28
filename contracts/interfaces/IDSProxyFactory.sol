// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface IDSProxyFactory {
    function isProxy(address _proxy) external view returns (bool);
}
