// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;


abstract contract DSAuthority {
    function canCall(address src, address dst, bytes4 sig) public virtual view returns (bool);
}
