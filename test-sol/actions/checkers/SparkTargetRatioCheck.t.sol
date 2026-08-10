// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    SparkTargetRatioCheck
} from "../../../contracts/actions/checkers/SparkTargetRatioCheck.sol";
import { SparkPayback } from "../../../contracts/actions/spark/SparkPayback.sol";
import { SparkRatioHelper } from "../../../contracts/actions/spark/helpers/SparkRatioHelper.sol";
import { ActionBase } from "../../../contracts/actions/ActionBase.sol";
import { SparkDataTypes } from "../../../contracts/interfaces/protocols/spark/SparkDataTypes.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { SparkPositionCreator } from "../../utils/positions/SparkPositionCreator.sol";
import { SparkEncode } from "../../utils/encode/SparkEncode.sol";
import { console2 } from "forge-std/console2.sol";

/// @title Unit tests for SparkTargetRatioCheck.
/// @notice Focused on the full repay support, where `targetRatio == 0` means the strategy
///         must leave the position with no debt (ratio == 0) and keep the extra collateral.
contract TestSparkTargetRatioCheck is SparkRatioHelper, SparkPositionCreator {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SparkTargetRatioCheck cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SparkPayback paybackAction;
    SmartWallet wallet;
    address walletAddr;
    address sender;

    /// @dev Mirrors SparkTargetRatioCheck.RATIO_OFFSET (5% acceptable offset).
    uint256 internal constant RATIO_OFFSET = 5e16;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");
        initTestPairs("Spark");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        SparkPositionCreator.setUp();
        cut = new SparkTargetRatioCheck();
        paybackAction = new SparkPayback();
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
                uint256 currRatio = cut.getRatio(DEFAULT_SPARK_MARKET, walletAddr);
                assertEq(currRatio, 0, "Ratio should be 0 after full repay");

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
                uint256 currRatio = cut.getRatio(DEFAULT_SPARK_MARKET, walletAddr);
                assertGt(currRatio, 0, "Position should still have debt");

                vm.expectRevert();
                wallet.execute(address(cut), _checkCalldata(0), 0);
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
                uint256 currRatio = cut.getRatio(DEFAULT_SPARK_MARKET, walletAddr);
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
                uint256 currRatio = cut.getRatio(DEFAULT_SPARK_MARKET, walletAddr);
                uint256 targetRatio = currRatio - 2 * RATIO_OFFSET;

                vm.expectRevert();
                wallet.execute(address(cut), _checkCalldata(targetRatio), 0);
            }

            vm.revertToState(snapshotId);
        }
    }

    /// @notice Non-zero target above the 5% offset must revert (the non full repay branch).
    function test_should_revert_normal_target_above_offset() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            if (_createPositionOrSkip(i)) {
                uint256 currRatio = cut.getRatio(DEFAULT_SPARK_MARKET, walletAddr);
                uint256 targetRatio = currRatio + 2 * RATIO_OFFSET;

                vm.expectRevert();
                wallet.execute(address(cut), _checkCalldata(targetRatio), 0);
            }

            vm.revertToState(snapshotId);
        }
    }

    /// @notice Non-zero target on an EOA position passes when `user` is supplied via subData.
    function test_should_pass_normal_target_within_offset_for_eoa() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            if (_createEOAPositionOrSkip(i)) {
                uint256 currRatio = cut.getRatio(DEFAULT_SPARK_MARKET, sender);
                assertGt(currRatio, 0, "EOA position should have debt");

                wallet.execute(
                    address(cut), _checkCalldataWithUserFromSubData(currRatio, sender), 0
                );
            }

            vm.revertToState(snapshotId);
        }
    }

    /// @notice Debt on the EOA but checker `user` is the proxy must revert (wrong account).
    function test_should_revert_normal_target_when_user_is_not_position_owner() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            if (_createEOAPositionOrSkip(i)) {
                uint256 eoaRatio = cut.getRatio(DEFAULT_SPARK_MARKET, sender);
                assertGt(eoaRatio, 0, "EOA position should have debt");

                vm.expectRevert();
                wallet.execute(address(cut), _checkCalldataForUser(eoaRatio, walletAddr), 0);
            }

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _createPositionOrSkip(uint256 _i) internal returns (bool) {
        PositionParams memory positionParams = PositionParams({
            collAddr: testPairs[_i].supplyAsset,
            collAmount: amountInUSDPrice(testPairs[_i].supplyAsset, 100_000),
            debtAddr: testPairs[_i].borrowAsset,
            debtAmount: amountInUSDPrice(testPairs[_i].borrowAsset, 40_000)
        });

        if (!isValidSupply(
                DEFAULT_SPARK_MARKET, positionParams.collAddr, positionParams.collAmount
            )) {
            console2.log("[SparkTargetRatioCheck] Can't supply asset. Skipping pair...");
            return false;
        }
        if (!isValidBorrow(
                DEFAULT_SPARK_MARKET, positionParams.debtAddr, positionParams.debtAmount
            )) {
            console2.log("[SparkTargetRatioCheck] Can't borrow asset. Skipping pair...");
            return false;
        }

        createSparkPosition(positionParams, wallet);
        return true;
    }

    function _createEOAPositionOrSkip(uint256 _i) internal returns (bool) {
        PositionParams memory positionParams = PositionParams({
            collAddr: testPairs[_i].supplyAsset,
            collAmount: amountInUSDPrice(testPairs[_i].supplyAsset, 100_000),
            debtAddr: testPairs[_i].borrowAsset,
            debtAmount: amountInUSDPrice(testPairs[_i].borrowAsset, 40_000)
        });

        if (!isValidSupply(
                DEFAULT_SPARK_MARKET, positionParams.collAddr, positionParams.collAmount
            )) {
            console2.log("[SparkTargetRatioCheck] Can't supply asset. Skipping EOA pair...");
            return false;
        }
        if (!isValidBorrow(
                DEFAULT_SPARK_MARKET, positionParams.debtAddr, positionParams.debtAmount
            )) {
            console2.log("[SparkTargetRatioCheck] Can't borrow asset. Skipping EOA pair...");
            return false;
        }

        _createSparkEOAPosition(positionParams);
        return true;
    }

    function _createSparkEOAPosition(PositionParams memory _params) internal {
        give(_params.collAddr, sender, _params.collAmount);

        vm.startPrank(sender);
        IERC20(_params.collAddr).approve(address(pool), _params.collAmount);
        pool.supply(_params.collAddr, _params.collAmount, sender, 0);
        pool.borrow(_params.debtAddr, _params.debtAmount, 2, 0, sender);
        vm.stopPrank();
    }

    function _fullPayback(address _debtAddr) internal returns (bool) {
        if (!isValidRepay(DEFAULT_SPARK_MARKET, _debtAddr)) {
            console2.log("[SparkTargetRatioCheck] Can't repay asset. Skipping pair...");
            return false;
        }

        SparkDataTypes.ReserveData memory reserveData = pool.getReserveData(_debtAddr);
        uint16 debtAssetId = reserveData.id;
        address debtVariableTokenAddr = reserveData.variableDebtTokenAddress;

        uint256 walletVariableDebt = balanceOf(debtVariableTokenAddr, walletAddr);

        give(_debtAddr, sender, walletVariableDebt * 2);
        approveAsSender(sender, _debtAddr, walletAddr, walletVariableDebt * 2);

        bytes memory paramsCalldata = SparkEncode.payback(
            type(uint256).max, sender, 2, debtAssetId, true, false, address(0), address(0)
        );
        bytes memory _calldata = abi.encodeWithSelector(
            SparkPayback.executeAction.selector, paramsCalldata, subData, paramMapping, returnValues
        );
        wallet.execute(address(paybackAction), _calldata, 0);

        (uint256 totalCollateralBase, uint256 totalDebtBase,,,,) =
            pool.getUserAccountData(walletAddr);
        assertEq(totalDebtBase, 0, "Debt not fully repaid");
        assertGt(totalCollateralBase, 0, "Collateral should remain after full repay");
        return true;
    }

    function _checkCalldata(uint256 _targetRatio) internal view returns (bytes memory) {
        return _checkCalldataForUser(_targetRatio, walletAddr);
    }

    function _checkCalldataForUser(uint256 _targetRatio, address _user)
        internal
        view
        returns (bytes memory)
    {
        bytes memory paramsCalldata = abi.encode(
            SparkTargetRatioCheck.Params({
                targetRatio: _targetRatio, market: DEFAULT_SPARK_MARKET, user: _user
            })
        );
        return abi.encodeWithSelector(
            ActionBase.executeAction.selector, paramsCalldata, subData, paramMapping, returnValues
        );
    }

    /// @dev Generic strategies supply `user` via subData (paramMapping length 3, index 128).
    function _checkCalldataWithUserFromSubData(uint256 _targetRatio, address _user)
        internal
        pure
        returns (bytes memory)
    {
        bytes memory paramsCalldata = abi.encode(
            SparkTargetRatioCheck.Params({
                targetRatio: _targetRatio, market: DEFAULT_SPARK_MARKET, user: address(0)
            })
        );
        uint8[] memory map = new uint8[](3);
        map[2] = 128;
        bytes32[] memory sd = new bytes32[](1);
        sd[0] = bytes32(uint256(uint160(_user)));
        bytes32[] memory emptyReturns = new bytes32[](0);
        return abi.encodeWithSelector(
            ActionBase.executeAction.selector, paramsCalldata, sd, map, emptyReturns
        );
    }
}
