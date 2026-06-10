// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AaveV3OpenRatioCheck } from "../../../contracts/actions/checkers/AaveV3OpenRatioCheck.sol";
import { AaveV3Payback } from "../../../contracts/actions/aaveV3/AaveV3Payback.sol";
import { AaveV3RatioHelper } from "../../../contracts/actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import { ActionBase } from "../../../contracts/actions/ActionBase.sol";
import { DataTypes } from "../../../contracts/interfaces/protocols/aaveV3/DataTypes.sol";

import { BaseTest } from "../../utils/BaseTest.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { AaveV3PositionCreator } from "../../utils/positions/AaveV3PositionCreator.sol";
import { AaveV3Encode } from "../../utils/encode/AaveV3Encode.sol";
import { console2 } from "forge-std/console2.sol";

/// @title Unit tests for AaveV3OpenRatioCheck.
/// @notice Focused on the full repay support, where `targetRatio == 0` means the strategy
///         must leave the position with no debt (ratio == 0) and keep the extra collateral.
contract TestAaveV3OpenRatioCheck is AaveV3RatioHelper, AaveV3PositionCreator {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3OpenRatioCheck cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3Payback paybackAction;
    SmartWallet wallet;
    address walletAddr;
    address sender;

    /// @dev Mirrors AaveV3OpenRatioCheck.RATIO_OFFSET (5% acceptable offset).
    uint256 internal constant RATIO_OFFSET = 5e16;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");
        initTestPairs("AaveV3");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        AaveV3PositionCreator.setUp();
        cut = new AaveV3OpenRatioCheck();
        paybackAction = new AaveV3Payback();
    }

    /*//////////////////////////////////////////////////////////////////////////
                       FULL REPAY TESTS (targetRatio == 0)
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Full repay leaves the position with no debt, so the safety ratio is 0.
    ///         With `targetRatio == 0` the check must pass.
    function test_should_pass_full_repay_when_no_debt_left() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            if (_createPositionOrSkip(i) && _fullPayback(testPairs[i].borrowAsset)) {
                uint256 currRatio = cut.getRatio(DEFAULT_AAVE_MARKET, walletAddr);
                assertEq(currRatio, 0, "Ratio should be 0 after full repay");

                // Should not revert: target is 0 and there is no debt left.
                wallet.execute(address(cut), _checkCalldata(0), 0);
            }

            vm.revertToState(snapshotId);
        }
    }

    /// @notice With `targetRatio == 0` but debt still present, the check must revert,
    ///         since a full repay strategy is only allowed to finish with no debt.
    function test_should_revert_full_repay_when_debt_left() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            if (_createPositionOrSkip(i)) {
                uint256 currRatio = cut.getRatio(DEFAULT_AAVE_MARKET, walletAddr);
                assertGt(currRatio, 0, "Position should still have debt");

                (bytes memory paramsCalldata, uint8[] memory pm) = _checkParams(0);
                vm.expectRevert(
                    abi.encodeWithSelector(
                        AaveV3OpenRatioCheck.BadAfterRatio.selector, currRatio, uint256(0)
                    )
                );
                cut.executeAction(paramsCalldata, subData, pm, returnValues);
            }

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                       NORMAL TARGET TESTS (regression)
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Non-zero target within the 5% offset still passes (the non full repay branch).
    function test_should_pass_normal_target_within_offset() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            if (_createPositionOrSkip(i)) {
                uint256 currRatio = cut.getRatio(DEFAULT_AAVE_MARKET, walletAddr);
                // target == currRatio => trivially within the accepted offset.
                wallet.execute(address(cut), _checkCalldata(currRatio), 0);
            }

            vm.revertToState(snapshotId);
        }
    }

    /// @notice Non-zero target below the 5% offset must revert (the non full repay branch).
    function test_should_revert_normal_target_below_offset() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            if (_createPositionOrSkip(i)) {
                uint256 currRatio = cut.getRatio(DEFAULT_AAVE_MARKET, walletAddr);
                // currRatio > targetRatio + RATIO_OFFSET => revert.
                uint256 targetRatio = currRatio - 2 * RATIO_OFFSET;

                (bytes memory paramsCalldata, uint8[] memory pm) = _checkParams(targetRatio);
                vm.expectRevert(
                    abi.encodeWithSelector(
                        AaveV3OpenRatioCheck.BadAfterRatio.selector, currRatio, targetRatio
                    )
                );
                cut.executeAction(paramsCalldata, subData, pm, returnValues);
            }

            vm.revertToState(snapshotId);
        }
    }

    /// @notice Non-zero target above the 5% offset must revert (the non full repay branch).
    function test_should_revert_normal_target_above_offset() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            if (_createPositionOrSkip(i)) {
                uint256 currRatio = cut.getRatio(DEFAULT_AAVE_MARKET, walletAddr);
                // currRatio < targetRatio - RATIO_OFFSET => revert.
                uint256 targetRatio = currRatio + 2 * RATIO_OFFSET;

                (bytes memory paramsCalldata, uint8[] memory pm) = _checkParams(targetRatio);
                vm.expectRevert(
                    abi.encodeWithSelector(
                        AaveV3OpenRatioCheck.BadAfterRatio.selector, currRatio, targetRatio
                    )
                );
                cut.executeAction(paramsCalldata, subData, pm, returnValues);
            }

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    /// @dev Opens a 100k coll / 40k debt position for the given test pair.
    ///      Returns false (and logs) when the pair can't be used on the selected network.
    function _createPositionOrSkip(uint256 _i) internal returns (bool) {
        PositionParams memory positionParams = PositionParams({
            collAddr: testPairs[_i].supplyAsset,
            collAmount: amountInUSDPrice(testPairs[_i].supplyAsset, 100_000),
            debtAddr: testPairs[_i].borrowAsset,
            debtAmount: amountInUSDPrice(testPairs[_i].borrowAsset, 40_000)
        });

        if (!isValidSupply(DEFAULT_AAVE_MARKET, positionParams.collAddr, positionParams.collAmount))
        {
            console2.log("[AaveV3OpenRatioCheck] Can't supply asset. Skipping pair...");
            return false;
        }
        if (!isValidBorrow(DEFAULT_AAVE_MARKET, positionParams.debtAddr, positionParams.debtAmount))
        {
            console2.log("[AaveV3OpenRatioCheck] Can't borrow asset. Skipping pair...");
            return false;
        }

        createAaveV3Position(positionParams, wallet);
        return true;
    }

    /// @dev Fully pays back the wallet's variable debt for `_debtAddr`, leaving the collateral.
    ///      Returns false (and logs) when the asset can't be repaid on the selected network.
    function _fullPayback(address _debtAddr) internal returns (bool) {
        if (!isValidRepay(DEFAULT_AAVE_MARKET, _debtAddr)) {
            console2.log("[AaveV3OpenRatioCheck] Can't repay asset. Skipping pair...");
            return false;
        }

        DataTypes.ReserveData memory reserveData = pool.getReserveData(_debtAddr);
        uint16 debtAssetId = reserveData.id;
        address debtVariableTokenAddr = reserveData.variableDebtTokenAddress;

        uint256 walletVariableDebt = balanceOf(debtVariableTokenAddr, walletAddr);

        // Give double the debt to cover any accrued interest, then repay with max uint.
        give(_debtAddr, sender, walletVariableDebt * 2);
        approveAsSender(sender, _debtAddr, walletAddr, walletVariableDebt * 2);

        bytes memory paramsCalldata = AaveV3Encode.payback(
            type(uint256).max,
            sender,
            uint8(DataTypes.InterestRateMode.VARIABLE),
            debtAssetId,
            true,
            false,
            address(0),
            address(0)
        );
        bytes memory _calldata = abi.encodeWithSelector(
            AaveV3Payback.executeAction.selector,
            paramsCalldata,
            subData,
            paramMapping,
            returnValues
        );
        wallet.execute(address(paybackAction), _calldata, 0);

        // Verify the full repay end state matches the feature intent:
        // no debt left, while the collateral stays in the position.
        (uint256 totalCollateralBase, uint256 totalDebtBase,,,,) =
            pool.getUserAccountData(walletAddr);
        assertEq(totalDebtBase, 0, "Debt not fully repaid");
        assertGt(totalCollateralBase, 0, "Collateral should remain after full repay");
        return true;
    }

    /// @dev Builds the check params and a 3-length paramMapping so the `user` param is honored
    ///      (see AaveV3OpenRatioCheck: the `user` field is only read when paramMapping.length == 3).
    function _checkParams(uint256 _targetRatio)
        internal
        view
        returns (bytes memory paramsCalldata, uint8[] memory pm)
    {
        paramsCalldata = abi.encode(
            AaveV3OpenRatioCheck.Params({
                targetRatio: _targetRatio, market: DEFAULT_AAVE_MARKET, user: walletAddr
            })
        );
        pm = new uint8[](3);
    }

    function _checkCalldata(uint256 _targetRatio) internal view returns (bytes memory) {
        (bytes memory paramsCalldata, uint8[] memory pm) = _checkParams(_targetRatio);
        return abi.encodeWithSelector(
            ActionBase.executeAction.selector, paramsCalldata, subData, pm, returnValues
        );
    }
}

/// @title Read-only checks for AaveV3OpenRatioCheck against real LTV-zero positions.
/// @notice Pinned to mainnet block 24_929_244 (see test-sol/config/config.json). These positions
///         hold LTV-zero collateral. We verify getRatio does NOT report 0 for them, so the full
///         repay path (targetRatio == 0) never mistakes an indebted position for a fully repaid one.
contract TestAaveV3OpenRatioCheckLtvZero is BaseTest, AaveV3RatioHelper {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3OpenRatioCheck cut;

    function setUp() public override {
        forkFromEnv("ETH-ltv0");

        if (!isMainnetSelected()) {
            vm.skip(true, "Test only supported on Mainnet");
        }

        cut = new AaveV3OpenRatioCheck();
    }

    /// @dev Real LTV-zero positions present at the pinned block.
    function _positions() internal pure returns (address[4] memory) {
        return [
            0x34780C209D5C575cc1C1cEB57aF95D4d2a69ddCF,
            0x5dc2da72254FC303680A7d644198EDFdbdF07883,
            0x28a55C4b4f9615FDE3CDAdDf6cc01FcF2E38A6b0,
            0xe40d278afD00E6187Db21ff8C96D572359Ef03bf
        ];
    }

    /// @notice None of these LTV-zero positions should report a zero ratio.
    function test_ltv_zero_positions_have_nonzero_ratio() public view {
        address[4] memory positions = _positions();
        for (uint256 i = 0; i < positions.length; ++i) {
            uint256 currRatio = cut.getRatio(DEFAULT_AAVE_MARKET, positions[i]);
            assertGt(currRatio, 0, "LTV-zero position reported zero ratio");
        }
    }

    /// @notice With targetRatio == 0 the check must revert for these still-indebted positions,
    ///         proving the full repay check does not wrongly accept them as fully repaid.
    function test_full_repay_check_reverts_for_ltv_zero_positions() public {
        address[4] memory positions = _positions();
        for (uint256 i = 0; i < positions.length; ++i) {
            uint256 currRatio = cut.getRatio(DEFAULT_AAVE_MARKET, positions[i]);

            bytes memory paramsCalldata = abi.encode(
                AaveV3OpenRatioCheck.Params({
                    targetRatio: 0, market: DEFAULT_AAVE_MARKET, user: positions[i]
                })
            );
            // length 3 so the `user` param is honored by the action
            uint8[] memory pm = new uint8[](3);

            vm.expectRevert(
                abi.encodeWithSelector(
                    AaveV3OpenRatioCheck.BadAfterRatio.selector, currRatio, uint256(0)
                )
            );
            cut.executeAction(paramsCalldata, new bytes32[](0), pm, new bytes32[](0));
        }
    }
}
