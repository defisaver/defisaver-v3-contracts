// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IDToken {
    function flashLoan(uint256 amount, bytes calldata data) external;
}
