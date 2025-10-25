// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IBotRegistry {
    function botList(address) external view returns (bool);
}
