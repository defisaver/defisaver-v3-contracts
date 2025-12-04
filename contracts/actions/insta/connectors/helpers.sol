// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../../../auth/AdminAuth.sol";

abstract contract Helpers is AdminAuth {
    error RecipeExecutionError();
}
