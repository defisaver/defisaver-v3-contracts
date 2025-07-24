// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {BaseTest} from "../../utils/BaseTest.sol";
import {SmartWallet} from "../../utils/SmartWallet.sol";
import {SkyStakingEngineOpen} from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import {SkyStakingEngineSelectFarm} from "../../../contracts/actions/sky/SkyStakingEngineSelectFarm.sol";

import {ILockstakeEngine} from "../../../contracts/interfaces/sky/ILockstakeEngine.sol";

import {ActionsUtils} from "../../utils/ActionsUtils.sol";
import {SkyExecuteActions} from "../../utils/executeActions/SkyExecuteActions.sol";

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
    address constant USDS_FARM = 0x38E4254bD82ED5Ee97CD1C4278FAae748d998865;
    address constant SPARK_FARM = 0x99cBC0e4E6427F6939536eD24d1275B95ff77404;

    SkyStakingEngineOpen open;

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
