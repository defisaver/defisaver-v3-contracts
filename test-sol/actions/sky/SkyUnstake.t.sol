// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { SkyStake } from "../../../contracts/actions/sky/SkyStake.sol";
import { SkyUnstake } from "../../../contracts/actions/sky/SkyUnstake.sol";

import { IStakingRewards } from "../../../contracts/interfaces/protocols/sky/IStakingRewards.sol";

import { SkyExecuteActions } from "../../utils/executeActions/SkyExecuteActions.sol";
import { SkyStakingEncode } from "../../utils/encode/SkyStakingEncode.sol";

contract TestSkyUnstake is SkyExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyUnstake cut;

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

        cut = new SkyUnstake();
        stake = new SkyStake();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_skyUnstake_Direct_USDS_SKY_STAKING_REWARDS() public {
        _baseTest(true, USDS_SKY_STAKING_REWARDS);
    }

    function test_skyUnstake_USDS_SKY_STAKING_REWARDS() public {
        _baseTest(false, USDS_SKY_STAKING_REWARDS);
    }

    function test_skyUnstake_Direct_USDS_POINTS_STAKING_REWARDS() public {
        _baseTest(true, USDS_POINTS_STAKING_REWARDS);
    }

    function test_skyUnstake_USDS_POINTS_STAKING_REWARDS() public {
        _baseTest(false, USDS_POINTS_STAKING_REWARDS);
    }

    function test_skyUnstake_Direct_USDS_GROOVE_STAKING_REWARDS() public {
        _baseTest(true, USDS_GROOVE_STAKING_REWARDS);
    }

    function test_skyUnstake_USDS_GROOVE_STAKING_REWARDS() public {
        _baseTest(false, USDS_GROOVE_STAKING_REWARDS);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _baseTest(bool _isDirect, address _stakingContract) internal {
        address stakingToken = IStakingRewards(_stakingContract).stakingToken();
        give(stakingToken, sender, AMOUNT);
        approveAsSender(sender, stakingToken, walletAddr, AMOUNT);
        executeSkyStake(_stakingContract, stakingToken, AMOUNT, sender, stake, wallet);

        uint256 balanceSenderBefore = balanceOf(stakingToken, sender);
        uint256 stakedBalanceBefore = IStakingRewards(_stakingContract).balanceOf(walletAddr);

        // Unstake half
        bytes memory executeActionCallData = executeActionCalldata(
            SkyStakingEncode.skyUnstake(_stakingContract, stakingToken, AMOUNT / 2, sender),
            _isDirect
        );
        wallet.execute(address(cut), executeActionCallData, 0);

        assertEq(balanceOf(stakingToken, sender), balanceSenderBefore + AMOUNT / 2);
        assertEq(
            IStakingRewards(_stakingContract).balanceOf(walletAddr),
            stakedBalanceBefore - AMOUNT / 2
        );

        // Unstake the rest with maxUint
        executeActionCallData = executeActionCalldata(
            SkyStakingEncode.skyUnstake(_stakingContract, stakingToken, type(uint256).max, sender),
            _isDirect
        );
        wallet.execute(address(cut), executeActionCallData, 0);

        assertEq(balanceOf(stakingToken, sender), balanceSenderBefore + AMOUNT);
        assertEq(
            IStakingRewards(_stakingContract).balanceOf(walletAddr), stakedBalanceBefore - AMOUNT
        );
    }
}
