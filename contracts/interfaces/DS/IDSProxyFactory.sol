// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSProxy } from "./IDSProxy.sol";

interface IDSProxyFactory {
    function isProxy(address _proxy) external view returns (bool);
    function build(address owner) external returns (IDSProxy proxy);
    function build() external returns (IDSProxy proxy);
}
