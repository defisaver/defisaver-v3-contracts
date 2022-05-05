// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IBoostedVaultWithLockup {

    function rawBalanceOf(address) external view returns (uint256);

    
    // @dev Stakes a given amount of the StakingToken for the sender
    // @param _amount Units of StakingToken
    function stake(uint256 _amount) external;

    
    // @dev Stakes a given amount of the StakingToken for a given beneficiary
    // @param _beneficiary Staked tokens are credited to this address
    // @param _amount      Units of StakingToken
    function stake(address _beneficiary, uint256 _amount) external;

    
    // @dev Withdraws stake from pool and claims any unlocked rewards.
    // Note, this function is costly - the args for _claimRewards
    // should be determined off chain and then passed to other fn
    function exit() external;

    
    // @dev Withdraws stake from pool and claims any unlocked rewards.
    // @param _first    Index of the first array element to claim
    // @param _last     Index of the last array element to claim
    function exit(uint256 _first, uint256 _last) external;

    
    // @dev Withdraws given stake amount from the pool
    // @param _amount Units of the staked token to withdraw
    function withdraw(uint256 _amount) external;

    
    // @dev Claims only the tokens that have been immediately unlocked, not including
    // those that are in the lockers.
    function claimReward() external;

    
    // @dev Claims all unlocked rewards for sender.
    // Note, this function is costly - the args for _claimRewards
    // should be determined off chain and then passed to other fn
    function claimRewards() external;

    
    // @dev Claims all unlocked rewards for sender. Both immediately unlocked
    // rewards and also locked rewards past their time lock.
    // @param _first    Index of the first array element to claim
    // @param _last     Index of the last array element to claim
    function claimRewards(uint256 _first, uint256 _last) external;

    
    // @dev Pokes a given account to reset the boost
    function pokeBoost(address _account) external;

    
    // @dev Gets the RewardsToken
    function getRewardToken() external view returns (address);

    
    // @dev Gets the last applicable timestamp for this reward period
    function lastTimeRewardApplicable() external view returns (uint256);

    
    // @dev Calculates the amount of unclaimed rewards per token since last update,
    // and sums with stored to give the new cumulative reward per token
    // @return 'Reward' per staked token
    function rewardPerToken() external view returns (uint256);

    
    // @dev Returned the units of IMMEDIATELY claimable rewards a user has to receive. Note - this
    // does NOT include the majority of rewards which will be locked up.
    // @param _account User address
    // @return Total reward amount earned
    function earned(address _account) external view returns (uint256);

    
    // @dev Calculates all unclaimed reward data, finding both immediately unlocked rewards
    // and those that have passed their time lock.
    // @param _account User address
    // @return amount Total units of unclaimed rewards
    // @return first Index of the first userReward that has unlocked
    // @return last Index of the last userReward that has unlocked
    function unclaimedRewards(address _account)
    external
    view
    returns (
        uint256 amount,
        uint256 first,
        uint256 last
    );
}