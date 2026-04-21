// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract MockAuthorityAaveV4 {
    function canCall(address caller, address target, bytes4 selector) external view returns (bool) {
        return true;
    }
}
