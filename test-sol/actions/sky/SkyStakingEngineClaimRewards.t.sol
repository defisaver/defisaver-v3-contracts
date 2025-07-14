// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {BaseTest} from "../../utils/BaseTest.sol";
import {SmartWallet} from "../../utils/SmartWallet.sol";

import {SkyStakingEngineOpen} from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import {SkyStakingEngineStake} from "../../../contracts/actions/sky/SkyStakingEngineStake.sol";
import {SkyStakingEngineClaimRewards} from "../../../contracts/actions/sky/SkyStakingEngineClaimRewards.sol";

import {ILockstakeEngine} from "../../../contracts/interfaces/sky/ILockstakeEngine.sol";
import {IStakingRewards} from "../../../contracts/interfaces/sky/IStakingRewards.sol";
import {IERC20} from "../../../contracts/interfaces/IERC20.sol";

import {ActionsUtils} from "../../utils/ActionsUtils.sol";
import {SkyExecuteActions} from "../../utils/executeActions/SkyExecuteActions.sol";

import "forge-std/Test.sol";

contract TestSkyStakingEngineClaimRewards is SkyExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyStakingEngineClaimRewards cut;

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
    SkyStakingEngineStake stake;

    event GetReward(address indexed owner, uint256 indexed index, address indexed farm, address to, uint256 amt);

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new SkyStakingEngineClaimRewards();
        open = new SkyStakingEngineOpen();
        stake = new SkyStakingEngineStake();
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

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _baseTest(bool _isDirect, address _farm) internal {
        // ! Give SKY to sender and approve wallet
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);
        uint256 index = 0;

        // ! Stake first
        executeSkyStakingEngineStake(STAKING_ENGINE, SKY_ADDRESS, index, AMOUNT, sender, _farm, open, stake, wallet);

        skip(365 days);

        // ! Execution logic of claiming rewards
        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineClaimRewardsEncode(STAKING_ENGINE, index, _farm, sender), _isDirect);
        vm.expectEmit(true, true, true, false, address(STAKING_ENGINE));
        emit GetReward(walletAddr, index, _farm, sender, 0);
        wallet.execute(address(cut), executeActionCallData, 0);
        // TODO -> add check if has more tokens than 0
    }
}
