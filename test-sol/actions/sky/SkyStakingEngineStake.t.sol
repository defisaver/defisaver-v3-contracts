// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {BaseTest} from "../../utils/BaseTest.sol";
import {SmartWallet} from "../../utils/SmartWallet.sol";
import {SkyStakingEngineStake} from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";
import {SkyStakingEngineOpen} from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";

import {ILockstakeEngine} from "../../../contracts/interfaces/sky/ILockstakeEngine.sol";
import {IStakingRewards} from "../../../contracts/interfaces/sky/IStakingRewards.sol";
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
    address constant USDS_FARM = 0x38E4254bD82ED5Ee97CD1C4278FAae748d998865;
    address constant SPARK_FARM = 0x99cBC0e4E6427F6939536eD24d1275B95ff77404;

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
    function test_skyStakingEngineStake_Direct_USDS_FARM() public {
        _baseTest(true, USDS_FARM);
    }

    function test_skyStakingEngineStake_USDS_FARM() public {
        _baseTest(false, USDS_FARM);
    }

    function test_skyStakingEngineStake_Direct_SPARK_FARM() public {
        _baseTest(true, SPARK_FARM);
    }

    function test_skyStakingEngineStake_SPARK_FARM() public {
        _baseTest(false, SPARK_FARM);
    }

    function test_skyStakingEngineStake_Direct_NO_FARM() public {
        _baseTest(true, address(0));
    }

    function test_skyStakingEngineStake_NO_FARM() public {
        _baseTest(false, address(0));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _baseTest(bool _isDirect, address _farm) internal {
        // ! Give SKY to sender and approve wallet
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);
        uint256 index = 0;

        // ! Open urn
        executeSkyStakingEngineOpen(STAKING_ENGINE, open, wallet);

        // ! Variables for checks
        address urnAddr = ILockstakeEngine(STAKING_ENGINE).ownerUrns(walletAddr, index);
        uint256 balanceSenderBefore = IERC20(SKY_ADDRESS).balanceOf(sender);
        uint256 walletAllowanceBefore = IERC20(SKY_ADDRESS).allowance(sender, walletAddr);
        uint256 balanceStakingEngineBefore = IERC20(SKY_ADDRESS).balanceOf(STAKING_ENGINE);
        // ! LSSky should be minted for Urn when executing `lock()` function, but it will be locked in FARM if farm is not address(0)
        uint256 balanceLSSkyUrnBefore = IERC20(LOCK_STAKE_SKY).balanceOf(urnAddr); // how much LSSky urn has
        uint256 balanceLSSkyFarmBefore;
        if (_farm != address(0)) balanceLSSkyFarmBefore = IStakingRewards(_farm).balanceOf(urnAddr); // how much LSSky urn has IN FARM

        // ! Execution logic
        bytes memory executeActionCallData = executeActionCalldata(
            skyStakingEngineStakeEncode(STAKING_ENGINE, SKY_ADDRESS, index, AMOUNT, sender, _farm), _isDirect
        );
        vm.expectEmit(true, true, true, true, address(STAKING_ENGINE));
        emit Lock(walletAddr, index, AMOUNT, SKY_REFERRAL_CODE);
        wallet.execute(address(cut), executeActionCallData, 0);

        // stack too deep fix
        {
            // ! After
            uint256 balanceSenderAfter = IERC20(SKY_ADDRESS).balanceOf(sender);
            uint256 walletAllowanceAfter = IERC20(SKY_ADDRESS).allowance(sender, walletAddr);
            uint256 balanceStakingEngineAfter = IERC20(SKY_ADDRESS).balanceOf(STAKING_ENGINE);
            uint256 balanceLSSkyUrnAfter = IERC20(LOCK_STAKE_SKY).balanceOf(urnAddr);
            uint256 balanceLSSkyFarmAfter;
            if (_farm != address(0)) balanceLSSkyFarmAfter = IStakingRewards(_farm).balanceOf(urnAddr);

            // ! Checks
            assertEq(balanceSenderBefore, balanceSenderAfter + AMOUNT);
            assertEq(walletAllowanceBefore, walletAllowanceAfter + AMOUNT);
            assertEq(balanceStakingEngineBefore, balanceStakingEngineAfter - AMOUNT);
            if (_farm != address(0)) {
                assertEq(balanceLSSkyUrnBefore, balanceLSSkyUrnAfter);
                assertEq(balanceLSSkyFarmBefore, balanceLSSkyFarmAfter - AMOUNT);
            } else {
                assertEq(balanceLSSkyUrnBefore, balanceLSSkyUrnAfter - AMOUNT);
                assertEq(balanceLSSkyFarmBefore, balanceLSSkyFarmAfter); // will be 0==0, never added in farm
            }
        }

        if (_farm != address(0)) {
            skip(365 days);
            vm.prank(walletAddr);
            ILockstakeEngine(STAKING_ENGINE).getReward(walletAddr, index, _farm, sender);
        }
    }
}
