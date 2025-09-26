// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {BaseTest} from "../../utils/BaseTest.sol";
import {SmartWallet} from "../../utils/SmartWallet.sol";

import {SkyStakingEngineOpen} from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import {SkyStakingEngineStake} from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";
import {SkyStakingEngineClaimRewards} from "../../../contracts/actions/sky/SkyStakingEngineClaimRewards.sol";
import {SkyStakingEngineSelectFarm} from "../../../contracts/actions/sky/SkyStakingEngineSelectFarm.sol";
import {SkyView} from "../../../contracts/views/SkyView.sol";

import {ILockstakeEngine} from "../../../contracts/interfaces/sky/ILockstakeEngine.sol";
import {IStakingRewards} from "../../../contracts/interfaces/sky/IStakingRewards.sol";
import {IERC20} from "../../../contracts/interfaces/IERC20.sol";

import {ActionsUtils} from "../../utils/ActionsUtils.sol";
import {SkyExecuteActions} from "../../utils/executeActions/SkyExecuteActions.sol";

contract TestSkyStakingEngineClaimRewards is SkyExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyStakingEngineClaimRewards cut;
    SkyView skyView;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    uint256 constant AMOUNT = 1000e18;

    SkyStakingEngineOpen open;
    SkyStakingEngineStake stake;
    SkyStakingEngineSelectFarm selectFarm;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new SkyStakingEngineClaimRewards();
        skyView = new SkyView();
        open = new SkyStakingEngineOpen();
        stake = new SkyStakingEngineStake();
        selectFarm = new SkyStakingEngineSelectFarm();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_skyStakingEngineClaimRewards_Direct_USDS_FARM() public {
        _baseTest(true, USDS_FARM, USDS_ADDRESS);
    }

    function test_skyStakingEngineClaimRewards_USDS_FARM() public {
        _baseTest(false, USDS_FARM, USDS_ADDRESS);
    }

    function test_skyStakingEngineClaimRewards_Direct_SPARK_FARM() public {
        _baseTest(true, SPARK_FARM, SPARK_ADDRESS);
    }

    function test_skyStakingEngineClaimRewards_SPARK_FARM() public {
        _baseTest(false, SPARK_FARM, SPARK_ADDRESS);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _baseTest(bool _isDirect, address _farm, address _rewardToken) internal {
        //  Give SKY to sender and approve wallet
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);
        uint256 index = 0;

        //  Stake first
        executeSkyStakingEngineStake(STAKING_ENGINE, index, _farm, AMOUNT, sender, open, selectFarm, stake, wallet);
        uint256 amountBefore = IERC20(_rewardToken).balanceOf(sender);

        skip(365 days);

        // Check amountEarned BEFORE claiming
        address[] memory farms = new address[](1);
        farms[0] = _farm;

        SkyView.UrnInfo[] memory urnsInfoBeforeClaim = skyView.getUserInfo(walletAddr, farms);
        uint256 amountEarnedBeforeClaim = urnsInfoBeforeClaim[index].amountsEarned[0].amountEarned;

        assertGt(amountEarnedBeforeClaim, 0, "Should have earned rewards before claiming");

        //  Execution logic of claiming rewards
        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineClaimRewardsEncode(STAKING_ENGINE, index, _farm, sender), _isDirect);
        vm.expectEmit(true, true, true, false, address(STAKING_ENGINE));
        emit ILockstakeEngine.GetReward(walletAddr, index, _farm, sender, 0);
        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 amountAfter = IERC20(_rewardToken).balanceOf(sender);
        assertGt(amountAfter, amountBefore);

        // Check amountEarned AFTER claiming
        SkyView.UrnInfo[] memory urnsInfoAfterClaim = skyView.getUserInfo(walletAddr, farms);
        uint256 amountEarnedAfterClaim = urnsInfoAfterClaim[index].amountsEarned[0].amountEarned;

        assertEq(amountEarnedAfterClaim, 0, "amountEarned should reset to 0 after claiming");
    }
}
