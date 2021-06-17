// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract DSAuthority {
    function canCall(
        address src,
        address dst,
        bytes4 sig
    ) public view virtual returns (bool);
}
