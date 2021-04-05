// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

abstract contract ILendToAaveMigrator {
    function migrateFromLEND(uint256 amount) external virtual;
}