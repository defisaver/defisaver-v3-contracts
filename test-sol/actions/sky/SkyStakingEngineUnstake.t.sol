// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {BaseTest} from "../../utils/BaseTest.sol";
import {SmartWallet} from "../../utils/SmartWallet.sol";
import {SkyStakingEngineOpen} from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import {SkyStakingEngineStake} from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";
import {SkyStakingEngineUnstake} from "../../../contracts/actions/sky/SkyStakingEngineUnstake.sol";

import {ILockstakeEngine} from "../../../contracts/interfaces/sky/ILockstakeEngine.sol";
import {IERC20} from "../../../contracts/interfaces/IERC20.sol";

import {ActionsUtils} from "../../utils/ActionsUtils.sol";
import {SkyExecuteActions} from "../../utils/executeActions/SkyExecuteActions.sol";

import "forge-std/Test.sol";

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
    SkyStakingEngineOpen open;
    SkyStakingEngineStake stake;

    event Free(address indexed owner, uint256 indexed index, address to, uint256 wad, uint256 freed);

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

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _baseTest(bool _isDirect) internal {
        // ! Give SKY to sender and approve wallet
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);
        uint256 index = 0;

        // ! Stake
        executeSkyStakingEngineStake(STAKING_ENGINE, SKY_ADDRESS, index, AMOUNT, sender, open, stake, wallet);

        // ! Variables for checks
        address urnAddr = ILockstakeEngine(STAKING_ENGINE).ownerUrns(walletAddr, index);
        IERC20 skyToken = IERC20(SKY_ADDRESS);
        uint256 balanceSenderBefore = skyToken.balanceOf(sender);
        uint256 balanceWalletBefore = skyToken.balanceOf(walletAddr);
        uint256 balanceStakingEngineBefore = skyToken.balanceOf(STAKING_ENGINE);
        uint256 balanceLSSkyUrnBefore = IERC20(LOCK_STAKE_SKY).balanceOf(urnAddr);

        // ! Execution logic
        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineUnstakeEncode(STAKING_ENGINE, index, AMOUNT, sender), _isDirect);
        skip(1000);
        vm.expectEmit(true, true, true, true, address(STAKING_ENGINE));
        emit Free(walletAddr, index, sender, AMOUNT, AMOUNT);
        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 balanceSenderAfter = skyToken.balanceOf(sender);
        uint256 balanceWalletAfter = skyToken.balanceOf(walletAddr);
        uint256 balanceStakingEngineAfter = skyToken.balanceOf(STAKING_ENGINE);
        uint256 balanceLSSkyUrnAfter = IERC20(LOCK_STAKE_SKY).balanceOf(urnAddr);

        // ! Checks
        assertEq(balanceSenderBefore, balanceSenderAfter - AMOUNT); // 0 before unstake, 100 after unstake
        assertEq(balanceWalletBefore, balanceWalletAfter);
        assertEq(balanceStakingEngineBefore, balanceStakingEngineAfter + AMOUNT);
        assertEq(balanceLSSkyUrnBefore, balanceLSSkyUrnAfter + AMOUNT);
    }
}
