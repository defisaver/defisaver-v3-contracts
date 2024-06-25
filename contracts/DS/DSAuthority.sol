// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract DSAuthority {
    function canCall(
        address src,
        address dst,
        bytes4 sig
    ) public view virtual returns (bool);
}
