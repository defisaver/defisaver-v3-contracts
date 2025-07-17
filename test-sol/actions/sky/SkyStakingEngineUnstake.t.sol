// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {BaseTest} from "../../utils/BaseTest.sol";
import {SmartWallet} from "../../utils/SmartWallet.sol";

import {SkyStakingEngineOpen} from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import {SkyStakingEngineStake} from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";
import {SkyStakingEngineUnstake} from "../../../contracts/actions/sky/SkyStakingEngineUnstake.sol";
import {SkyStakingEngineSelectFarm} from "../../../contracts/actions/sky/SkyStakingEngineSelectFarm.sol";

import {ILockstakeEngine} from "../../../contracts/interfaces/sky/ILockstakeEngine.sol";
import {IStakingRewards} from "../../../contracts/interfaces/sky/IStakingRewards.sol";
import {IERC20} from "../../../contracts/interfaces/IERC20.sol";

import {ActionsUtils} from "../../utils/ActionsUtils.sol";
import {SkyExecuteActions} from "../../utils/executeActions/SkyExecuteActions.sol";

contract TestSkyStakingEngineUnstake is SkyExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyStakingEngineUnstake cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    uint256 constant AMOUNT = 1000e18;
    address constant USDS_FARM = 0x38E4254bD82ED5Ee97CD1C4278FAae748d998865;

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

        cut = new SkyStakingEngineUnstake();
        open = new SkyStakingEngineOpen();
        stake = new SkyStakingEngineStake();
        selectFarm = new SkyStakingEngineSelectFarm();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_skyStakingEngineUnstake_Direct() public {
        _baseTest(true);
    }

    function test_skyStakingEngineUnstake() public {
        _baseTest(false);
    }

    function test_RevertIf_NotStakedBefore() public {
        // Open
        executeSkyStakingEngineOpen(STAKING_ENGINE, open, wallet);

        uint256 index = 0;
        // Execution logic
        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineUnstakeEncode(STAKING_ENGINE, index, AMOUNT, sender), true);

        vm.expectRevert();
        wallet.execute(address(cut), executeActionCallData, 0);
    }

    function test_RevertIf_UnstakeMoreThanStaked(bool _isDirect) public {
        // Give SKY to sender and approve wallet
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);
        uint256 index = 0;

        // Stake
        executeSkyStakingEngineStake(STAKING_ENGINE, index, USDS_FARM, AMOUNT, sender, open, selectFarm, stake, wallet);

        // Execution logic
        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineUnstakeEncode(STAKING_ENGINE, index, AMOUNT * 2, sender), _isDirect);

        vm.expectRevert();
        wallet.execute(address(cut), executeActionCallData, 0);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _baseTest(bool _isDirect) internal {
        // Give SKY to sender and approve wallet
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);
        uint256 index = 0;

        // Stake
        executeSkyStakingEngineStake(STAKING_ENGINE, index, USDS_FARM, AMOUNT, sender, open, selectFarm, stake, wallet);

        // Variables for checks
        address urnAddr = ILockstakeEngine(STAKING_ENGINE).ownerUrns(walletAddr, index);
        IERC20 skyToken = IERC20(SKY_ADDRESS);

        uint256 balanceSenderBefore = skyToken.balanceOf(sender); // should have 0
        uint256 balanceStakingEngineBefore = skyToken.balanceOf(STAKING_ENGINE);
        uint256 balanceUrnStakedLSSkyInFarmBefore = IStakingRewards(USDS_FARM).balanceOf(urnAddr); // should have AMOUNT

        // Execution logic
        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineUnstakeEncode(STAKING_ENGINE, index, AMOUNT, sender), _isDirect);
        skip(365 days);
        vm.expectEmit(true, true, true, true, address(STAKING_ENGINE));
        emit ILockstakeEngine.Free(walletAddr, index, sender, AMOUNT, AMOUNT);
        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 balanceSenderAfter = skyToken.balanceOf(sender);
        uint256 balanceStakingEngineAfter = skyToken.balanceOf(STAKING_ENGINE);
        uint256 balanceUrnStakedLSSkyInFarmAfter = IStakingRewards(USDS_FARM).balanceOf(urnAddr); // should have 0

        // Checks
        assertEq(balanceSenderBefore, balanceSenderAfter - AMOUNT); // 0 before unstake -> had all staked, 100 after unstake -> unstaked all
        assertEq(balanceStakingEngineBefore, balanceStakingEngineAfter + AMOUNT);
        assertEq(balanceUrnStakedLSSkyInFarmBefore, balanceUrnStakedLSSkyInFarmAfter + AMOUNT); // before unstaking, user staked LSSKY in Farm to earn rewards, after unstaking LSSKY he doesnt have that AMOUNT staked in farm

        vm.prank(walletAddr);
        ILockstakeEngine(STAKING_ENGINE).getReward(walletAddr, index, USDS_FARM, sender); // can get rewards after unstaked
    }
}
