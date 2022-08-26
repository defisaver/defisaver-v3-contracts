// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract ICometRewards {
    function claimTo(
        address comet,
        address src,
        address to,
        bool shouldAccrue
    ) external virtual;
}
