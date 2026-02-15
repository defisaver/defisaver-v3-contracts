// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    TransientStorageCancun
} from "../../../contracts/utils/transient/TransientStorageCancun.sol";
import { Addresses } from "test-sol/utils/Addresses.sol";
import { AaveV4RatioCheck } from "../../../contracts/actions/checkers/AaveV4RatioCheck.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4TestBase } from "../aaveV4/AaveV4TestBase.t.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV4RatioCheck is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4RatioCheck cut;
    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    TransientStorageCancun constant tempStorage =
        TransientStorageCancun(Addresses.TRANSIENT_STORAGE_CANCUN);

    struct TestConfig {
        AaveV4RatioCheck.RatioState ratioState;
        int256 startRatioDiff;
        int256 targetRatioDiff;
        bool expectRevert;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV4RatioCheck();
    }

    function test_shouldRevertIfRepayDoesNotIncreaseRatio() public {
        // currentRatio = startRatio (no increase)
        TestConfig memory config = TestConfig({
            ratioState: AaveV4RatioCheck.RatioState.IN_REPAY,
            startRatioDiff: 0,
            targetRatioDiff: 0,
            expectRevert: true
        });
        _baseTest(config);
    }

    function test_shouldRevertIfRepayTriggersBoostAfter() public {
        // currentRatio > targetRatio + offset (overshoot)
        // startRatio = currentRatio - 0.1 (increased)
        // targetRatio = currentRatio - 0.06 (so current > target + 0.05)
        TestConfig memory config = TestConfig({
            ratioState: AaveV4RatioCheck.RatioState.IN_REPAY,
            startRatioDiff: -1e17,
            targetRatioDiff: -6e16,
            expectRevert: true
        });
        _baseTest(config);
    }

    function test_shouldRevertIfBoostDoesNotDecreaseRatio() public {
        // currentRatio = startRatio (no decrease)
        TestConfig memory config = TestConfig({
            ratioState: AaveV4RatioCheck.RatioState.IN_BOOST,
            startRatioDiff: 0,
            targetRatioDiff: 0,
            expectRevert: true
        });
        _baseTest(config);
    }

    function test_shouldRevertIfBoostTriggersRepayAfter() public {
        // currentRatio < targetRatio - offset (undershoot)
        // startRatio = currentRatio + 0.1 (decreased)
        // targetRatio = currentRatio + 0.06 (so current < target - 0.05)
        TestConfig memory config = TestConfig({
            ratioState: AaveV4RatioCheck.RatioState.IN_BOOST,
            startRatioDiff: 1e17,
            targetRatioDiff: 6e16,
            expectRevert: true
        });
        _baseTest(config);
    }

    function test_shouldPassForValidRepay() public {
        // startRatio < currentRatio <= targetRatio + offset
        // startRatio = currentRatio - 0.1
        // targetRatio = currentRatio
        TestConfig memory config = TestConfig({
            ratioState: AaveV4RatioCheck.RatioState.IN_REPAY,
            startRatioDiff: -1e17,
            targetRatioDiff: 0,
            expectRevert: false
        });
        _baseTest(config);
    }

    function test_shouldPassForValidBoost() public {
        // startRatio > currentRatio >= targetRatio - offset
        // startRatio = currentRatio + 0.1
        // targetRatio = currentRatio
        TestConfig memory config = TestConfig({
            ratioState: AaveV4RatioCheck.RatioState.IN_BOOST,
            startRatioDiff: 1e17,
            targetRatioDiff: 0,
            expectRevert: false
        });
        _baseTest(config);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function _baseTest(TestConfig memory config) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];

            if (!_executeAaveV4Open(testPair, 500, 100, sender, wallet)) {
                console2.log(
                    "Failed to open Aave V4 position. Check caps and reserve/spoke status."
                );
                continue;
            }

            uint256 currentRatio = cut.getRatio(testPair.spoke, walletAddr);

            uint256 startRatio = uint256(int256(currentRatio) + config.startRatioDiff);
            uint256 targetRatio = uint256(int256(currentRatio) + config.targetRatioDiff);

            tempStorage.setBytes32(AAVE_V4_RATIO_KEY, bytes32(startRatio));

            bytes memory executeActionCallData = executeActionCalldata(
                aaveV4RatioCheckEncode(
                    uint8(config.ratioState), targetRatio, testPair.spoke, walletAddr
                ),
                false
            );

            if (config.expectRevert) {
                vm.expectRevert(
                    abi.encodeWithSelector(
                        AaveV4RatioCheck.BadAfterRatio.selector, startRatio, currentRatio
                    )
                );
                // Mask GS013 error
                vm.prank(walletAddr);
                (bool success,) = address(cut).call(executeActionCallData);
                console2.log("success", success);
            } else {
                // This should not revert for test to pass
                wallet.execute(address(cut), executeActionCallData, 0);
            }

            vm.revertToState(snapshotId);
        }
    }
}
