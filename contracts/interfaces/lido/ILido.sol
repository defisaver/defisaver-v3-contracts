// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

abstract contract ILido {
    function submit(address _referral) external virtual payable returns (uint256);
}