// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

abstract contract ILendToAaveMigrator {
    function migrateFromLEND(uint256 amount) external virtual;
}