// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import {
    TransientStorageCancun
} from "../../../contracts/utils/transient/TransientStorageCancun.sol";
import { Addresses } from "test-sol/utils/helpers/MainnetAddresses.sol";
import { AaveV4Payback } from "../../../contracts/actions/aaveV4/AaveV4Payback.sol";
import { AaveV4RatioCheck } from "../../../contracts/actions/checkers/AaveV4RatioCheck.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4TestBase } from "../aaveV4/AaveV4TestBase.t.sol";
import { console2 } from "forge-std/console2.sol";
import { AaveV4Encode } from "test-sol/utils/encode/AaveV4Encode.sol";

contract TestAaveV4RatioCheck is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4RatioCheck cut;
    AaveV4Payback paybackAction;
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
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV4RatioCheck();
        paybackAction = new AaveV4Payback();
    }

    /*//////////////////////////////////////////////////////////////////////////
                       FULL REPAY TESTS (targetRatio == 0)
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Full repay leaves no debt, so Aave V4 reports health factor as max uint256.
    function test_should_pass_full_repay_when_no_debt_left() public {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];
            if (!_executeAaveV4Open(testPair, 500, 100, wallet, false)) {
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 startRatio = cut.getRatio(testPair.spoke, walletAddr);
            assertLt(startRatio, type(uint256).max, "Position should have debt before full repay");

            if (!_fullPayback(testPair)) {
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 currRatio = cut.getRatio(testPair.spoke, walletAddr);
            assertEq(currRatio, type(uint256).max, "Ratio should be max uint256 after full repay");

            tempStorage.setBytes32(AAVE_V4_RATIO_KEY, bytes32(startRatio));
            wallet.execute(address(cut), _ratioCheckCalldata(testPair.spoke, 0), 0);

            vm.revertToState(snapshotId);
        }
    }

    /// @notice With `targetRatio == 0` but debt still present, the check must revert.
    function test_should_revert_full_repay_when_debt_left() public {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];
            if (!_executeAaveV4Open(testPair, 500, 100, wallet, false)) {
                vm.revertToState(snapshotId);
                continue;
            }

            uint256 currRatio = cut.getRatio(testPair.spoke, walletAddr);
            assertLt(currRatio, type(uint256).max, "Position should still have debt");

            tempStorage.setBytes32(AAVE_V4_RATIO_KEY, bytes32(currRatio));

            bytes memory paramsCalldata = AaveV4Encode.ratioCheck(
                uint8(AaveV4RatioCheck.RatioState.IN_REPAY), 0, testPair.spoke, walletAddr
            );
            vm.expectRevert(
                abi.encodeWithSelector(
                    AaveV4RatioCheck.BadAfterRatio.selector, currRatio, currRatio
                )
            );
            cut.executeAction(paramsCalldata, subData, paramMapping, returnValues);

            vm.revertToState(snapshotId);
        }
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

            if (!_executeAaveV4Open(testPair, 500, 100, wallet, false)) {
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
                AaveV4Encode.ratioCheck(
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

    function _fullPayback(AaveV4TestPair memory _testPair) internal returns (bool) {
        ISpoke spoke = ISpoke(_testPair.spoke);
        address underlying = spoke.getReserve(_testPair.debtReserveId).underlying;
        uint256 userDebt = spoke.getUserTotalDebt(_testPair.debtReserveId, walletAddr);
        if (userDebt == 0) {
            return false;
        }

        give(underlying, sender, userDebt * 2);
        approveAsSender(sender, underlying, walletAddr, userDebt * 2);

        wallet.execute(
            address(paybackAction),
            executeActionCalldata(
                AaveV4Encode.payback(
                    _testPair.spoke, walletAddr, sender, _testPair.debtReserveId, type(uint256).max
                ),
                true
            ),
            0
        );

        assertEq(spoke.getUserTotalDebt(_testPair.debtReserveId, walletAddr), 0);
        return true;
    }

    function _ratioCheckCalldata(address _spoke, uint256 _targetRatio)
        internal
        view
        returns (bytes memory)
    {
        return executeActionCalldata(
            AaveV4Encode.ratioCheck(
                uint8(AaveV4RatioCheck.RatioState.IN_REPAY), _targetRatio, _spoke, walletAddr
            ),
            false
        );
    }
}
