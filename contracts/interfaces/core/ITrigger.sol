// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ITrigger {
    function isTriggered(bytes memory, bytes memory) external returns (bool);
    function isChangeable() external view returns (bool);
    function changedSubData(bytes memory) external view returns (bytes memory);
}
