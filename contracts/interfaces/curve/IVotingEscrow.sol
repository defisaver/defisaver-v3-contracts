// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;
pragma experimental ABIEncoderV2;

interface IVotingEscrow {
    function create_lock(uint256 _amount, uint256 _unlockTime) external;
    function increase_amount(uint256 _amount) external;
    function increase_unlock_time(uint256 _unlockTime) external;
    function withdraw() external;
}