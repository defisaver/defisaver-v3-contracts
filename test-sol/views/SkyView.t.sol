// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {SmartWallet} from "../utils/SmartWallet.sol";
import {SkyStakingEngineStake} from "../../contracts/actions/sky/SkyStakingEngineStake.sol";
import {SkyStakingEngineOpen} from "../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import {SkyStakingEngineSelectFarm} from "../../contracts/actions/sky/SkyStakingEngineSelectFarm.sol";
import {SkyView} from "../../contracts/views/SkyView.sol";

import {ILockstakeEngine} from "../../contracts/interfaces/sky/ILockstakeEngine.sol";
import {IStakingRewards} from "../../contracts/interfaces/sky/IStakingRewards.sol";

import {SkyExecuteActions} from "../utils/executeActions/SkyExecuteActions.sol";

contract TestSkyView is SkyExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyView cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    uint256 constant AMOUNT = 1000e18;

    SkyStakingEngineStake stake;
    SkyStakingEngineOpen open;
    SkyStakingEngineSelectFarm selectFarm;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new SkyView();
        open = new SkyStakingEngineOpen();
        selectFarm = new SkyStakingEngineSelectFarm();
        stake = new SkyStakingEngineStake();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_skyView_Direct_USDS_FARM() public {
        _baseTest(true, USDS_FARM);
    }

    function test_skyView_USDS_FARM() public {
        _baseTest(false, USDS_FARM);
    }

    function test_skyView_Direct_SPARK_FARM() public {
        _baseTest(true, SPARK_FARM);
    }

    function test_skyView_SPARK_FARM() public {
        _baseTest(false, SPARK_FARM);
    }

    function test_skyView_Direct_NO_FARM() public {
        _baseTest(true, address(0));
    }

    function test_skyView_NO_FARM() public {
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

        // Open urn and select farm
        executeSkyStakingEngineSelectFarm(STAKING_ENGINE, index, _farm, open, selectFarm, wallet);

        // Variables for checks
        address urnAddr = ILockstakeEngine(STAKING_ENGINE).ownerUrns(walletAddr, index);

        // Execution logic
        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineStakeEncode(STAKING_ENGINE, index, AMOUNT, sender), _isDirect);
        vm.expectEmit(true, true, true, true, address(STAKING_ENGINE));
        emit ILockstakeEngine.Lock(walletAddr, index, AMOUNT, SKY_REFERRAL_CODE);
        wallet.execute(address(stake), executeActionCallData, 0);

        address[] memory farms = new address[](2);
        farms[0] = USDS_FARM;
        farms[1] = SPARK_FARM;

        SkyView.UrnInfo[] memory urnsInfo = cut.getUserInfo(walletAddr, farms);

        assertEq(urnsInfo[index].urnIndex, 0);
        assertEq(urnsInfo[index].urnAddr, urnAddr);
        assertEq(urnsInfo[index].selectedFarm, _farm);
        assertEq(urnsInfo[index].amountStaked, AMOUNT);

        if (_farm != address(0)) {
            assertEq(urnsInfo[index].farmRewardToken, IStakingRewards(_farm).rewardsToken());
        } else {
            assertEq(urnsInfo[index].farmRewardToken, address(0));
        }

        skip(365 days);
        SkyView.UrnInfo[] memory urnsInfoAfterAYear = cut.getUserInfo(walletAddr, farms);

        for (uint256 i = 0; i < urnsInfoAfterAYear[index].amountsEarned.length; i++) {
            if (urnsInfoAfterAYear[index].amountsEarned[i].farm == _farm) {
                assertGt(
                    urnsInfoAfterAYear[index].amountsEarned[i].amountEarned,
                    urnsInfo[index].amountsEarned[i].amountEarned
                );
                break;
            }
        }
    }
}
