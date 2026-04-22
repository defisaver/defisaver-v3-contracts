// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import {
    AaveV4CollateralSwitch
} from "../../../contracts/actions/aaveV4/AaveV4CollateralSwitch.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";
import { AaveV4Encode } from "test-sol/utils/encode/AaveV4Encode.sol";

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

    struct TestConfig {
        bool isDirect;
        bool isEoa;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV4CollateralSwitch();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_switch_collateral() public {
        _baseTest(TestConfig({ isDirect: false, isEoa: false }));
    }

    function test_switch_collateral_direct() public {
        _baseTest(TestConfig({ isDirect: true, isEoa: false }));
    }

    function test_switch_collateral_eoa() public {
        _baseTest(TestConfig({ isDirect: false, isEoa: true }));
    }

    function test_switch_collateral_direct_eoa() public {
        _baseTest(TestConfig({ isDirect: true, isEoa: true }));
    }

    function _baseTest(TestConfig memory _testConfig) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];

            _executeAaveV4Supply(testPair, 10, wallet, _testConfig.isEoa);

            _switch(testPair.spoke, testPair.collReserveId, _testConfig);

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _switch(address _spoke, uint256 _reserveId, TestConfig memory _testConfig) internal {
        address onBehalf = _testConfig.isEoa ? sender : walletAddr;

        bytes memory disableCallData = executeActionCalldata(
            AaveV4Encode.collateralSwitch(_spoke, onBehalf, _reserveId, false), _testConfig.isDirect
        );

        wallet.execute(address(cut), disableCallData, 0);

        ISpoke.UserAccountData memory userAccountData = ISpoke(_spoke).getUserAccountData(onBehalf);
        assertEq(userAccountData.activeCollateralCount, 0);

        bytes memory enableCallData = executeActionCalldata(
            AaveV4Encode.collateralSwitch(_spoke, onBehalf, _reserveId, true), _testConfig.isDirect
        );

        wallet.execute(address(cut), enableCallData, 0);

        userAccountData = ISpoke(_spoke).getUserAccountData(onBehalf);
        assertEq(userAccountData.activeCollateralCount, 1);
    }
}
