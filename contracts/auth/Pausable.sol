// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./AdminAuth.sol";


abstract contract Pausable is AdminAuth {
    bool isPaused;
    function setPaused(bool _isPaused) external onlyAdmin {
        isPaused = _isPaused;
    }

    error ContractPaused();
    modifier notPaused {
        if (isPaused) revert ContractPaused();
        _;
    }
}