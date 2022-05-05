// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../interfaces/convex/IConvexToken.sol";
import "../../../interfaces/convex/IConvexToken.sol";
import "../../../interfaces/convex/IBaseRewardPool.sol";
import "../../../interfaces/convex/IRewardPool.sol";
import "../../../utils/SafeMath.sol";
import "../../../utils/TokenUtils.sol";

import "./MainnetConvexAddresses.sol";

contract ConvexHelper is MainnetConvexAddresses {
    using SafeMath for uint256;
    using TokenUtils for address;

    uint256 internal constant CVX_TOTAL_CLIFFS = 1000;
    uint256 internal constant CVX_REDUCTION_PER_CLIFF = 1e23;
    uint256 internal constant CVX_MAX_SUPPLY = 1e26;

    struct Reward {
        address token;
        uint256 earned;
    }

    enum DepositOption {
        WRAP,
        STAKE,
        WRAP_AND_STAKE
    }

    enum WithdrawOption {
        UNWRAP,
        UNSTAKE,
        UNSTAKE_AND_UNWRAP
    }

    /// @dev taken from Cvx.mint()
    function _cvxMintAmount(uint256 _amount) internal view returns (uint256) {
        uint256 supply = IERC20(CVX_ADDR).totalSupply();
        
        //use current supply to gauge cliff
        //this will cause a bit of overflow into the next cliff range
        //but should be within reasonable levels.
        //requires a max supply check though
        uint256 cliff = supply.div(CVX_REDUCTION_PER_CLIFF);
        //mint if below total cliffs
        uint256 totalCliffs = CVX_TOTAL_CLIFFS;
        if(cliff < totalCliffs){
            //for reduction% take inverse of current cliff
            uint256 reduction = totalCliffs.sub(cliff);
            //reduce
            _amount = _amount.mul(reduction).div(totalCliffs);

            //supply cap check
            uint256 amtTillMax = CVX_MAX_SUPPLY.sub(supply);
            if(_amount > amtTillMax){
                _amount = amtTillMax;
            }
        }

        return _amount;
    }

    /// @notice This function gets (base and extra) earned reward amounts
    /// @return rewards - array of length 2 (for base rewards) + extraRewardsLength of tuples (token, earned)
    /// @dev CRV and CVX are always base rewards and are located at indices 0 and 1 respectively
    /// @dev some pools have CRV or CVX as extra rewards and their earned amounts are added to base rewards earned amounts
    /// @dev in these cases the return array will have empty elements
    function _earnedRewards(address _account, address _rewardContract) internal view returns (
        Reward[] memory rewards
    ) {
        uint256 crvEarned = IBaseRewardPool(_rewardContract).earned(_account);
        uint256 cvxEarned = _cvxMintAmount(crvEarned);
    
        uint256 extraRewardsLength = IBaseRewardPool(_rewardContract).extraRewardsLength();
        rewards = new Reward[](extraRewardsLength + 2);

        uint256 c = 2;
        for (uint256 i = 0; i < extraRewardsLength; i++) {
            address rewardPool = IBaseRewardPool(_rewardContract).extraRewards(i);
            address token = IRewardPool(rewardPool).rewardToken();
            uint256 earned = IRewardPool(rewardPool).earned(_account);
            if (token == CRV_ADDR) {
                crvEarned += earned;
                continue;
            }
            if (token == CVX_ADDR) {
                cvxEarned += earned;
                continue;
            }
            rewards[c++] = Reward(token, earned);
        }

        rewards[0] = Reward(CRV_ADDR, crvEarned);
        rewards[1] = Reward(CVX_ADDR, cvxEarned);
    }

    function _transferRewards(
        address _from,
        address _to,
        Reward[] memory _rewards
    ) internal returns (uint256) {
        if (_from != _to) {
            for (uint256 i = 0; i < _rewards.length; i++) {
                address token = _rewards[i].token;
                if (token == address(0)) break;
                uint256 earned = _rewards[i].earned;
                earned = token.pullTokensIfNeeded(_from,earned);
                token.withdrawTokens(_to, earned);
            }
        }

        return _rewards[0].earned;
    }
}