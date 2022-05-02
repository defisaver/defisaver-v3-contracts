// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../actions/convex/helpers/ConvexHelper.sol";

contract ConvexView is ConvexHelper {
    /// @notice This function gets (base and extra) earned reward amounts
    /// @return rewards - array of length 2 (for base rewards) + extraRewardsLength of tuples (token, earned)
    /// @dev CRV and CVX are always base rewards and are located at indices 0 and 1 respectively
    /// @dev some pools have CRV or CVX as extra rewards and their earned amounts are added to base rewards earned amounts
    /// @dev in these cases the return array will have empty elements
    function earnedRewards(address _account, address _rewardContract) public view returns (
        Reward[] memory rewards
    ) {
        return _earnedRewards(_account, _rewardContract);
    }

}