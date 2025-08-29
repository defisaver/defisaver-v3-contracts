// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IUmbrellaRewardsController {
    function claimSelectedRewards(address asset, address[] calldata rewards, address receiver)
        external
        returns (uint256[] memory);

    function getAllRewards(address asset) external view returns (address[] memory);

    /**
     * @notice  Returns `emissionPerSecond` for certain `asset` and `reward`.
     * @dev Return zero if asset or rewards aren't set.
     * An integer quantity is returned, although the accuracy of the calculations in reality is higher.
     * @param asset Address of the `asset` which current emission of `reward` should be returned
     * @param reward Address of the `reward` which `emissionPerSecond` should be returned
     * @return emissionPerSecond Current amount of rewards distributed every second
     */
    function calculateCurrentEmission(address asset, address reward)
        external
        view
        returns (uint256 emissionPerSecond);
}
