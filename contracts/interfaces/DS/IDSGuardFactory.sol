// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSGuard } from "./IDSGuard.sol";

interface IDSGuardFactory {
    function newGuard() external returns (IDSGuard guard);
}
