// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {BaseTest} from "../../utils/BaseTest.sol";
import {SmartWallet} from "../../utils/SmartWallet.sol";
import {SkyStakingEngineStake} from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";
import {SkyStakingEngineOpen} from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";

import {ILockstakeEngine} from "../../../contracts/interfaces/sky/ILockstakeEngine.sol";
import {IERC20} from "../../../contracts/interfaces/IERC20.sol";

import {ActionsUtils} from "../../utils/ActionsUtils.sol";
import {SkyExecuteActions} from "../../utils/executeActions/SkyExecuteActions.sol";

import "forge-std/Test.sol";

contract TestSkyStakingEngineStake is SkyExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyStakingEngineStake cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    uint256 constant AMOUNT = 1000e18;
    SkyStakingEngineOpen open;

    event Lock(address indexed owner, uint256 indexed index, uint256 wad, uint16 ref);

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new SkyStakingEngineStake();
        open = new SkyStakingEngineOpen();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_skyStakingEngineStake_Direct() public {
        _baseTest(true);
    }

    function test_skyStakingEngineStake() public {
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

        // ! Open urn
        executeSkyStakingEngineOpen(STAKING_ENGINE, open, wallet);

        // ! Variables for checks
        address urnAddr = ILockstakeEngine(STAKING_ENGINE).ownerUrns(walletAddr, index);
        IERC20 skyToken = IERC20(SKY_ADDRESS);
        uint256 balanceSenderBefore = skyToken.balanceOf(sender);
        uint256 balanceWalletBefore = skyToken.balanceOf(walletAddr);
        uint256 walletAllowanceBefore = skyToken.allowance(sender, walletAddr);
        uint256 balanceStakingEngineBefore = skyToken.balanceOf(STAKING_ENGINE);
        // ! LOCK_STAKE_SKY should be minted for Urn when executing `lock()` function
        uint256 balanceLSSkyUrnBefore = IERC20(LOCK_STAKE_SKY).balanceOf(urnAddr);

        // ! Execution logic
        bytes memory executeActionCallData = executeActionCalldata(
            skyStakingEngineStakeEncode(STAKING_ENGINE, SKY_ADDRESS, index, AMOUNT, sender), _isDirect
        );

        vm.expectEmit(true, true, true, true, address(STAKING_ENGINE));
        emit Lock(walletAddr, index, AMOUNT, SKY_REFERRAL_CODE);
        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 balanceSenderAfter = skyToken.balanceOf(sender);
        uint256 balanceWalletAfter = skyToken.balanceOf(walletAddr);
        uint256 walletAllowanceAfter = skyToken.allowance(sender, walletAddr);
        uint256 balanceStakingEngineAfter = skyToken.balanceOf(STAKING_ENGINE);
        uint256 balanceLSSkyUrnAfter = IERC20(LOCK_STAKE_SKY).balanceOf(urnAddr);

        // ! Checks
        assertEq(balanceSenderBefore, balanceSenderAfter + AMOUNT);
        assertEq(balanceWalletBefore, balanceWalletAfter);
        assertEq(walletAllowanceBefore, walletAllowanceAfter + AMOUNT);
        assertEq(balanceStakingEngineBefore + AMOUNT, balanceStakingEngineAfter);
        assertEq(balanceLSSkyUrnBefore + AMOUNT, balanceLSSkyUrnAfter);
    }
}
