// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {BaseTest} from "../../utils/BaseTest.sol";
import {SmartWallet} from "../../utils/SmartWallet.sol";
import {SkyStakingEngine, SkyHelper} from "../../../contracts/actions/sky/SkyStakingEngine.sol";

import {ILockstakeEngine} from "../../../contracts/interfaces/sky/ILockstakeEngine.sol";
import {IERC20} from "../../../contracts/interfaces/IERC20.sol";

import {ActionsUtils} from "../../utils/ActionsUtils.sol";
import {SkyExecuteActions} from "../../utils/executeActions/SkyExecuteActions.sol";

import "forge-std/Test.sol";

contract TestSkyStakingEngine is SkyExecuteActions, SkyHelper {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SkyStakingEngine cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    uint256 constant AMOUNT = 1000e18;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new SkyStakingEngine();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_skyStakingEngineExecuteActionDirect() public {
        // ! Give SKY to sender and approve wallet
        give(SKY_ADDRESS, sender, AMOUNT);
        approveAsSender(sender, SKY_ADDRESS, walletAddr, AMOUNT);

        // ! Open URN
        ILockstakeEngine lockStakeEngine = ILockstakeEngine(STAKING_ENGINE);
        uint16 index = 0;
        // TODO -> should this be sender or wallet ???
        vm.prank(walletAddr);
        address urnAddr = lockStakeEngine.open(index);

        // TODO -> EXPECT EMIT EVENT !!!!
        _executeActionCalldata(STAKING_ENGINE, SKY_ADDRESS, AMOUNT, index, sender, cut, wallet);

        // check sender and wallet balance before and after
        // check if vat is greater now for AMOUNT
        // check if check urn? Gotta find addr
        // assertEq(AMOUNT, lockStakeEngine.);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
}
