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
        bool ratioAboveActual;
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
            ratioAboveActual: false,
            state: 0,
            expectedTriggered: false
        });

        _baseTest(tc);
    }

    /// @dev state=OVER triggers when actual > target, so set target below actual.
    function test_triggerRatioOver() public {
        TestConfig memory tc = TestConfig({
            isMaxUintRatio: false,
            supplyAmountUsd: 1000,
            borrowAmountUsd: 100,
            ratioAboveActual: false,
            state: 0,
            expectedTriggered: true
        });

        _baseTest(tc);
    }

    /// @dev state=UNDER triggers when actual < target, so set target above actual.
    function test_triggerRatioUnder() public {
        TestConfig memory tc = TestConfig({
            isMaxUintRatio: false,
            supplyAmountUsd: 1000,
            borrowAmountUsd: 100,
            ratioAboveActual: true,
            state: 1,
            expectedTriggered: true
        });

        _baseTest(tc);
    }

    /// @dev state=OVER triggers when actual > target, so set target above actual to NOT trigger.
    function test_dontTriggerRatioOver() public {
        TestConfig memory tc = TestConfig({
            isMaxUintRatio: false,
            supplyAmountUsd: 1000,
            borrowAmountUsd: 100,
            ratioAboveActual: true,
            state: 0,
            expectedTriggered: false
        });

        _baseTest(tc);
    }

    /// @dev state=UNDER triggers when actual < target, so set target below actual to NOT trigger.
    function test_dontTriggerRatioUnder() public {
        TestConfig memory tc = TestConfig({
            isMaxUintRatio: false,
            supplyAmountUsd: 1000,
            borrowAmountUsd: 100,
            ratioAboveActual: false,
            state: 1,
            expectedTriggered: false
        });

        _baseTest(tc);
    }

    function _baseTest(TestConfig memory _tc) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            if (!_executeAaveV4Supply(tests[i], _tc.supplyAmountUsd, wallet, false)) {
                console2.log("Failed to supply assets. Check caps and reserve/spoke status.");
                continue;
            }

            if (!_tc.isMaxUintRatio) {
                if (!_executeAaveV4Borrow(
                        tests[i].spoke,
                        tests[i].debtReserveId,
                        _tc.borrowAmountUsd,
                        sender,
                        wallet,
                        false
                    )) {
                    console2.log("Failed to borrow assets. Check caps and reserve/spoke status.");
                    continue;
                }
            }

            uint256 actualRatio = getRatio(tests[i].spoke, walletAddr);
            console2.log("Actual ratio for pair", i, actualRatio);

            uint256 ratio;
            if (_tc.isMaxUintRatio) {
                ratio = 0;
            } else if (_tc.ratioAboveActual) {
                ratio = actualRatio * 150 / 100;
            } else {
                ratio = actualRatio * 50 / 100;
            }

            bytes memory subData = abi.encode(walletAddr, tests[i].spoke, ratio, _tc.state);

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
