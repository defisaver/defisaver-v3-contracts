// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4RefreshPremium } from "../../../contracts/actions/aaveV4/AaveV4RefreshPremium.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV4RefreshPremium is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4RefreshPremium cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    struct TestConfig {
        bool isDirect;
        bool refreshDynamicReserveConfig;
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

        cut = new AaveV4RefreshPremium();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_refresh_premium() public {
        _baseTest(TestConfig({ isDirect: false, refreshDynamicReserveConfig: false, isEoa: false }));
    }

    function test_refresh_dynamic_reserve_config() public {
        _baseTest(TestConfig({ isDirect: true, refreshDynamicReserveConfig: true, isEoa: false }));
    }

    function test_refresh_premium_eoa() public {
        _baseTest(TestConfig({ isDirect: false, refreshDynamicReserveConfig: false, isEoa: true }));
    }

    function test_refresh_dynamic_reserve_config_eoa() public {
        _baseTest(TestConfig({ isDirect: true, refreshDynamicReserveConfig: true, isEoa: true }));
    }

    function _baseTest(TestConfig memory _testConfig) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];

            uint256 supplyAmountUsd = 500;
            uint256 borrowAmountUsd = 100;

            if (!_executeAaveV4Open(
                    testPair, supplyAmountUsd, borrowAmountUsd, wallet, _testConfig.isEoa
                )) {
                continue;
            }

            _refreshPremium(testPair, _testConfig);

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _refreshPremium(AaveV4TestPair memory _testPair, TestConfig memory _testConfig)
        internal
    {
        ISpoke spoke = ISpoke(_testPair.spoke);
        address onBehalf = _testConfig.isEoa ? sender : walletAddr;

        if (_testConfig.isEoa) {
            _enableEoaRefreshPremiumPositionManager(spoke, sender, walletAddr);
        }

        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4RefreshPremiumEncode(
                _testPair.spoke, onBehalf, _testConfig.refreshDynamicReserveConfig
            ),
            _testConfig.isDirect
        );

        uint256 riskPremiumBefore = spoke.getUserLastRiskPremium(onBehalf);
        uint32 dynamicConfigKeyBefore =
            spoke.getUserPosition(_testPair.collReserveId, onBehalf).dynamicConfigKey;

        console2.log("riskPremiumBefore", riskPremiumBefore);
        console2.log("dynamicConfigKeyBefore", uint256(dynamicConfigKeyBefore));

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 riskPremiumAfter = spoke.getUserLastRiskPremium(onBehalf);
        uint32 dynamicConfigKeyAfter =
            spoke.getUserPosition(_testPair.collReserveId, onBehalf).dynamicConfigKey;

        console2.log("riskPremiumAfter", riskPremiumAfter);
        console2.log("dynamicConfigKeyAfter", uint256(dynamicConfigKeyAfter));
    }
}
