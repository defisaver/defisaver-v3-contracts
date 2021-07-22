// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

interface IInstaIndex {
    function build(
        address _owner,
        uint accountVersion,
        address _origin
    ) external returns (address _account);
}