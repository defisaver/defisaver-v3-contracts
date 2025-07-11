// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {BaseTest} from "../../utils/BaseTest.sol";
import {SmartWallet} from "../../utils/SmartWallet.sol";
import {SkyStakingEngineOpen} from "../../../contracts/actions/sky/SkyStakingEngineOpen.sol";
import {SkyHelper} from "../../../contracts/actions/sky/helpers/SkyHelper.sol";

import {ILockstakeEngine} from "../../../contracts/interfaces/sky/ILockstakeEngine.sol";
import {IERC20} from "../../../contracts/interfaces/IERC20.sol";

import {ActionsUtils} from "../../utils/ActionsUtils.sol";

import "forge-std/Test.sol";

contract TestSkyStakingEngineOpen is ActionsUtils, BaseTest, SkyHelper {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyStakingEngineOpen cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    event Open(address indexed owner, uint256 indexed index, address urn);

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new SkyStakingEngineOpen();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/

    function test_skyStakingEngineOpen() public {
        _baseTest(false);
    }

    function test_skyStakingEngineOpen_Direct() public {
        _baseTest(true);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _baseTest(bool _isDirect) internal {
        bytes memory executeActionCallData =
            executeActionCalldata(skyStakingEngineOpenEncode(STAKING_ENGINE), _isDirect);
        ILockstakeEngine stakingEngine = ILockstakeEngine(STAKING_ENGINE);

        vm.expectEmit(true, true, false, false, address(STAKING_ENGINE));
        emit Open(walletAddr, 0, address(0));
        wallet.execute(address(cut), executeActionCallData, 0);
        assertEq(1, stakingEngine.ownerUrnsCount(walletAddr));
        assertTrue(stakingEngine.isUrnAuth(walletAddr, 0, walletAddr));

        // ! executing for 2nd time to check if index is handled properly
        vm.expectEmit(true, true, false, false, address(STAKING_ENGINE));
        emit Open(address(walletAddr), 1, address(0));
        wallet.execute(address(cut), executeActionCallData, 0);
        // owns 2 urns
        assertEq(2, stakingEngine.ownerUrnsCount(walletAddr));
        // index 0 and index 1
        assertTrue(stakingEngine.isUrnAuth(walletAddr, 1, walletAddr));
    }
}
