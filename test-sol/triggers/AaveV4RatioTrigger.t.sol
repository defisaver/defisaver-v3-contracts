// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AaveV4RatioTrigger } from "../../contracts/triggers/AaveV4RatioTrigger.sol";
import { AaveV4TestBase } from "test-sol/actions/aaveV4/AaveV4TestBase.t.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV4RatioTrigger is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4RatioTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    struct TestConfig {
        bool isMaxUintRatio;
        uint256 supplyAmountUsd;
        uint256 borrowAmountUsd;
        uint256 ratio;
        uint8 state;
        bool expectedTriggered;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV4RatioTrigger();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_maxUintRatio() public {
        TestConfig memory tc = TestConfig({
            isMaxUintRatio: true,
            supplyAmountUsd: 1000,
            borrowAmountUsd: 0,
            ratio: 0,
            state: 0,
            expectedTriggered: false
        });

        _baseTest(tc);
    }

    function test_triggerRatioOver() public {
        TestConfig memory tc = TestConfig({
            isMaxUintRatio: false,
            supplyAmountUsd: 1000,
            borrowAmountUsd: 100,
            ratio: 5 * 1e18,
            state: 0,
            expectedTriggered: true
        });

        _baseTest(tc);
    }

    function test_triggerRatioUnder() public {
        TestConfig memory tc = TestConfig({
            isMaxUintRatio: false,
            supplyAmountUsd: 1000,
            borrowAmountUsd: 100,
            ratio: 15 * 1e18,
            state: 1,
            expectedTriggered: true
        });

        _baseTest(tc);
    }

    function test_dontTriggerRatioOver() public {
        TestConfig memory tc = TestConfig({
            isMaxUintRatio: false,
            supplyAmountUsd: 1000,
            borrowAmountUsd: 100,
            ratio: 15 * 1e18,
            state: 0,
            expectedTriggered: false
        });

        _baseTest(tc);
    }

    function test_dontTriggerRatioUnder() public {
        TestConfig memory tc = TestConfig({
            isMaxUintRatio: false,
            supplyAmountUsd: 1000,
            borrowAmountUsd: 100,
            ratio: 5 * 1e18,
            state: 1,
            expectedTriggered: false
        });

        _baseTest(tc);
    }

    function _baseTest(TestConfig memory _tc) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            // Supply collateral.
            if (!_executeAaveV4Supply(tests[i], _tc.supplyAmountUsd, sender, wallet)) {
                console2.log("Failed to supply assets. Check caps and reserve/spoke status.");
                continue;
            }

            // When there is no debt, ratio should be max uint256. In that case avoid borrowing.
            if (!_tc.isMaxUintRatio) {
                if (!_executeAaveV4Borrow(
                        tests[i].spoke, tests[i].debtReserveId, _tc.borrowAmountUsd, sender, wallet
                    )) {
                    console2.log("Failed to borrow assets. Check caps and reserve/spoke status.");
                    continue;
                }
            }

            bytes memory subData = abi.encode(walletAddr, tests[i].spoke, _tc.ratio, _tc.state);

            bool triggered = cut.isTriggered(bytes(""), subData);

            if (_tc.isMaxUintRatio) {
                assertEq(triggered, false);
            } else {
                assertEq(triggered, _tc.expectedTriggered);
            }

            vm.revertToState(snapshotId);
        }
    }
}
