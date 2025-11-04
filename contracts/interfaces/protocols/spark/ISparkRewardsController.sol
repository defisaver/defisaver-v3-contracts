// SPDX-License-Identifier: agpl-3.0
pragma solidity =0.8.24;

interface ISparkRewardsController {
    /**
     * @dev Claims reward for a user to the desired address, on all the assets of the pool, accumulating the pending rewards
     * @param assets List of assets to check eligible distributions before claiming rewards
     * @param amount The amount of rewards to claim
     * @param to The address that will be receiving the rewards
     * @param reward The address of the reward token
     * @return The amount of rewards claimed
     *
     */
    function claimRewards(address[] calldata assets, uint256 amount, address to, address reward)
        external
        returns (uint256);
}
