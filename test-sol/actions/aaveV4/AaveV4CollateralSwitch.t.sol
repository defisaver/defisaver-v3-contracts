// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import {
    AaveV4CollateralSwitch
} from "../../../contracts/actions/aaveV4/AaveV4CollateralSwitch.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";

contract TestAaveV4CollateralSwitch is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4CollateralSwitch cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV4CollateralSwitch();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_switch_collateral() public {
        bool isDirect = false;
        _baseTest(isDirect);
    }

    function test_switch_collateral_direct() public {
        bool isDirect = true;
        _baseTest(isDirect);
    }

    function _baseTest(bool _isDirect) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];

            // This will active the reserve as collateral by default.
            _executeAaveV4Supply(testPair, 10, sender, wallet);

            _switch(testPair.spoke, testPair.collReserveId, _isDirect, false);

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _switch(address _spoke, uint256 _reserveId, bool _isDirect, bool _useAsCollateral)
        internal
    {
        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4CollateralSwitchEncode(_spoke, walletAddr, _reserveId, _useAsCollateral),
            _isDirect
        );
        wallet.execute(address(cut), executeActionCallData, 0);
        ISpoke.UserAccountData memory userAccountData =
            ISpoke(_spoke).getUserAccountData(walletAddr);
        assertEq(userAccountData.activeCollateralCount, _useAsCollateral ? 1 : 0);
    }
}
