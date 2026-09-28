// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { SkyStake } from "../../../contracts/actions/sky/SkyStake.sol";

import { IStakingRewards } from "../../../contracts/interfaces/protocols/sky/IStakingRewards.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";

import { SkyExecuteActions } from "../../utils/executeActions/SkyExecuteActions.sol";
import { SkyStakingEncode } from "../../utils/encode/SkyStakingEncode.sol";

contract TestSkyStake is SkyExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyStake cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    uint256 constant AMOUNT = 1000e18;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new SkyStake();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_skyStake_Direct_USDS_SKY_STAKING_REWARDS() public {
        _baseTest(true, USDS_SKY_STAKING_REWARDS);
    }

    function test_skyStake_USDS_SKY_STAKING_REWARDS() public {
        _baseTest(false, USDS_SKY_STAKING_REWARDS);
    }

    function test_skyStake_Direct_USDS_POINTS_STAKING_REWARDS() public {
        _baseTest(true, USDS_POINTS_STAKING_REWARDS);
    }

    function test_skyStake_USDS_POINTS_STAKING_REWARDS() public {
        _baseTest(false, USDS_POINTS_STAKING_REWARDS);
    }

    function test_skyStake_Direct_USDS_GROOVE_STAKING_REWARDS() public {
        _baseTest(true, USDS_GROOVE_STAKING_REWARDS);
    }

    function test_skyStake_USDS_GROOVE_STAKING_REWARDS() public {
        _baseTest(false, USDS_GROOVE_STAKING_REWARDS);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _baseTest(bool _isDirect, address _stakingContract) internal {
        address stakingToken = IStakingRewards(_stakingContract).stakingToken();
        give(stakingToken, sender, AMOUNT);
        approveAsSender(sender, stakingToken, walletAddr, AMOUNT);

        uint256 stakedBalanceBefore = IStakingRewards(_stakingContract).balanceOf(walletAddr);

        // Stake half of the balance
        bytes memory executeActionCallData = executeActionCalldata(
            SkyStakingEncode.skyStake(_stakingContract, stakingToken, AMOUNT / 2, sender), _isDirect
        );
        wallet.execute(address(cut), executeActionCallData, 0);

        assertEq(balanceOf(stakingToken, sender), AMOUNT / 2);
        assertEq(IERC20(stakingToken).allowance(sender, walletAddr), AMOUNT / 2);
        assertEq(
            IStakingRewards(_stakingContract).balanceOf(walletAddr),
            stakedBalanceBefore + AMOUNT / 2
        );

        // Stake the rest with maxUint on top of the existing position
        executeActionCallData = executeActionCalldata(
            SkyStakingEncode.skyStake(_stakingContract, stakingToken, type(uint256).max, sender),
            _isDirect
        );
        wallet.execute(address(cut), executeActionCallData, 0);

        assertEq(balanceOf(stakingToken, sender), 0);
        assertEq(IERC20(stakingToken).allowance(sender, walletAddr), 0);
        assertEq(
            IStakingRewards(_stakingContract).balanceOf(walletAddr), stakedBalanceBefore + AMOUNT
        );
    }
}
