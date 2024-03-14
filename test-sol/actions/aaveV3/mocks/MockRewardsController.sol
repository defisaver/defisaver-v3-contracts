// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

contract MockRewardsController {
    function claimRewards(
        address[] calldata,
        uint256 amount,
        address,
        address
    ) external pure returns (uint256) {
        return amount;
    } 
}
