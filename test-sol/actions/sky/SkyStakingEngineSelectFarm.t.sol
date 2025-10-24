// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { SkyStakingEngineOpen } from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import { SkyStakingEngineStake } from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";
import { SkyStakingEngineSelectFarm } from "../../../contracts/actions/sky/SkyStakingEngineSelectFarm.sol";

import { ILockstakeEngine } from "../../../contracts/interfaces/sky/ILockstakeEngine.sol";

import { SkyExecuteActions } from "../../utils/executeActions/SkyExecuteActions.sol";

contract TestSkyStakingEngineSelectFarm is SkyExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyStakingEngineSelectFarm cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    uint256 constant AMOUNT = 1000e18;

    SkyStakingEngineOpen open;
    SkyStakingEngineStake stake;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        open = new SkyStakingEngineOpen();
        cut = new SkyStakingEngineSelectFarm();
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

    function test_skyStakingEngineStake_Change_Farm_From_USDS_to_SPARK() public {
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);

        // stake and select USDS farm
        executeSkyStakingEngineStake(STAKING_ENGINE, 0, USDS_FARM, AMOUNT, sender, open, cut, stake, wallet);

        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineSelectFarmEncode(STAKING_ENGINE, 0, SPARK_FARM), true);

        vm.expectEmit(true, true, true, true, address(STAKING_ENGINE));
        emit ILockstakeEngine.SelectFarm(walletAddr, 0, SPARK_FARM, SKY_REFERRAL_CODE);
        wallet.execute(address(cut), executeActionCallData, 0);
    }

    function test_skyStakingEngineStake_Change_Farm_from_SPARK_to_USDS() public {
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);

        // stake and select SPARK farm
        executeSkyStakingEngineStake(STAKING_ENGINE, 0, SPARK_FARM, AMOUNT, sender, open, cut, stake, wallet);

        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineSelectFarmEncode(STAKING_ENGINE, 0, USDS_FARM), true);

        vm.expectEmit(true, true, true, true, address(STAKING_ENGINE));
        emit ILockstakeEngine.SelectFarm(walletAddr, 0, USDS_FARM, SKY_REFERRAL_CODE);
        wallet.execute(address(cut), executeActionCallData, 0);
    }

    function test_skyStakingEngineStake_Can_Remove_Farm_After_Selected() public {
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);

        // stake and select USDS farm
        executeSkyStakingEngineStake(STAKING_ENGINE, 0, USDS_FARM, AMOUNT, sender, open, cut, stake, wallet);

        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineSelectFarmEncode(STAKING_ENGINE, 0, address(0)), true);

        vm.expectEmit(true, true, true, true, address(STAKING_ENGINE));
        emit ILockstakeEngine.SelectFarm(walletAddr, 0, address(0), SKY_REFERRAL_CODE);
        wallet.execute(address(cut), executeActionCallData, 0);
    }

    function test_skyStakingEngineStake_RevertIf_Selects_The_Same_Farm() public {
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);

        // stake and select USDS farm
        executeSkyStakingEngineStake(STAKING_ENGINE, 0, USDS_FARM, AMOUNT, sender, open, cut, stake, wallet);

        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineSelectFarmEncode(STAKING_ENGINE, 0, USDS_FARM), true);

        vm.expectRevert(); // "LockstakeEngine/same-farm"
        wallet.execute(address(cut), executeActionCallData, 0);
    }

    function test_skyStakingEngineStake_RevertIf_Selects_NonExisting_Farm() public {
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);

        // stake and select USDS farm
        executeSkyStakingEngineStake(STAKING_ENGINE, 0, USDS_FARM, AMOUNT, sender, open, cut, stake, wallet);

        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineSelectFarmEncode(STAKING_ENGINE, 0, bob), true);

        vm.expectRevert(); // "LockstakeEngine/farm-unsupported-or-deleted"
        wallet.execute(address(cut), executeActionCallData, 0);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _baseTest(bool _isDirect, address _farm) internal {
        // Open urn
        executeSkyStakingEngineOpen(STAKING_ENGINE, open, wallet);
        uint256 index = 0;

        // Execution logic
        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineSelectFarmEncode(STAKING_ENGINE, index, _farm), _isDirect);

        if (_farm != address(0)) {
            vm.expectEmit(true, true, true, true, address(STAKING_ENGINE));
            emit ILockstakeEngine.SelectFarm(walletAddr, index, _farm, SKY_REFERRAL_CODE);
        } else {
            vm.expectRevert();
        }
        wallet.execute(address(cut), executeActionCallData, 0);
    }
}
