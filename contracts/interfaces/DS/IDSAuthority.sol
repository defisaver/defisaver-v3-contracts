// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IDSAuthority {
    function canCall(address src, address dst, bytes4 sig) external view returns (bool);
}
