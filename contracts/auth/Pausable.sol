// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { AdminAuth } from "./AdminAuth.sol";

abstract contract Pausable is AdminAuth {
    bool public isPaused;

    error ContractPaused();

    modifier notPaused {
        if (isPaused) revert ContractPaused();
        _;
    }

    function setPaused(bool _isPaused) external onlyAdmin {
        isPaused = _isPaused;
    }
}