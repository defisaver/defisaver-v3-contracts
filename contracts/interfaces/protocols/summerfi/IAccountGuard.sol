// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IAccountGuard {
    function permit(address caller, address target, bool allowed) external;
}
