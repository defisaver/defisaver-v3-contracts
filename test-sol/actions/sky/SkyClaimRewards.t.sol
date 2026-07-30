// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { SkyStake } from "../../../contracts/actions/sky/SkyStake.sol";
import { SkyClaimRewards } from "../../../contracts/actions/sky/SkyClaimRewards.sol";

import { IStakingRewards } from "../../../contracts/interfaces/protocols/sky/IStakingRewards.sol";

import { SkyExecuteActions } from "../../utils/executeActions/SkyExecuteActions.sol";
import { SkyStakingEncode } from "../../utils/encode/SkyStakingEncode.sol";

contract TestSkyClaimRewards is SkyExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyClaimRewards cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    uint256 constant AMOUNT = 1000e18;

    SkyStake stake;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new SkyClaimRewards();
        stake = new SkyStake();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @dev Reward period for this farm may be over, so only check that claimed amount
    /// matches earned amount, without requiring rewards to be greater than zero
    function test_skyClaimRewards_Direct_USDS_SKY_STAKING_REWARDS() public {
        _baseTest(true, USDS_SKY_STAKING_REWARDS, false);
    }

    function test_skyClaimRewards_USDS_SKY_STAKING_REWARDS() public {
        _baseTest(false, USDS_SKY_STAKING_REWARDS, false);
    }

    function test_skyClaimRewards_Direct_USDS_GROOVE_STAKING_REWARDS() public {
        _baseTest(true, USDS_GROOVE_STAKING_REWARDS, true);
    }

    function test_skyClaimRewards_USDS_GROOVE_STAKING_REWARDS() public {
        _baseTest(false, USDS_GROOVE_STAKING_REWARDS, true);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _baseTest(bool _isDirect, address _stakingContract, bool _expectRewards) internal {
        address stakingToken = IStakingRewards(_stakingContract).stakingToken();
        address rewardToken = IStakingRewards(_stakingContract).rewardsToken();

        give(stakingToken, sender, AMOUNT);
        approveAsSender(sender, stakingToken, walletAddr, AMOUNT);
        executeSkyStake(_stakingContract, stakingToken, AMOUNT, sender, stake, wallet);

        skip(1 days);

        uint256 earned = IStakingRewards(_stakingContract).earned(walletAddr);
        if (_expectRewards) {
            assertGt(earned, 0);
        }

        uint256 rewardBalanceSenderBefore = balanceOf(rewardToken, sender);

        bytes memory executeActionCallData = executeActionCalldata(
            SkyStakingEncode.skyClaimRewards(_stakingContract, rewardToken, sender), _isDirect
        );
        wallet.execute(address(cut), executeActionCallData, 0);

        assertEq(balanceOf(rewardToken, sender), rewardBalanceSenderBefore + earned);
        assertEq(IStakingRewards(_stakingContract).earned(walletAddr), 0);
        assertEq(balanceOf(rewardToken, walletAddr), 0);
    }
}
