// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC20 } from "../interfaces/IERC20.sol";

/// @title MockDSProxyFactory
/// @dev Used only in tests.
contract MockDSProxyFactory {
    function isProxy(address) public pure returns (bool) { return false; }
}

