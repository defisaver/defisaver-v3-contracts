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

    uint256 internal immutable CVX_REDUCTION_PER_CLIFF;
    uint256 internal immutable CVX_TOTAL_CLIFFS;
    uint256 internal immutable CVX_MAX_SUPPLY;

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

    constructor() {
        IConvexToken CVX = IConvexToken(CVX_ADDR);
        CVX_REDUCTION_PER_CLIFF = CVX.reductionPerCliff();
        CVX_TOTAL_CLIFFS = CVX.totalCliffs();
        CVX_MAX_SUPPLY = CVX.maxSupply();
    }

    /// @dev taken from Cvx.mint()
    function cvxMintAmount(uint256 _amount) public view returns (uint256) {
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

    function earnedRewards(address _account, address _rewardContract) public view returns (
        Reward[] memory rewards
    ) {
        uint256 crvEarned = IBaseRewardPool(_rewardContract).earned(_account);
        uint256 cvxEarned = cvxMintAmount(crvEarned);
    
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
        address from,
        address to,
        Reward[] memory rewards
    ) internal returns (uint256) {
        if (from != to) {
            for (uint256 i = 0; i < rewards.length; i++) {
                address token = rewards[i].token;
                if (token == address(0)) break;
                uint256 earned = rewards[i].earned;
                earned = token.pullTokensIfNeeded(from,earned);
                token.withdrawTokens(to, earned);
            }
        }

        return rewards[0].earned;
    }
}