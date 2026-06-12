// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    MorphoBlueTargetRatioCheck
} from "../../../contracts/actions/checkers/MorphoBlueTargetRatioCheck.sol";
import {
    MorphoBlueSupplyCollateral
} from "../../../contracts/actions/morpho-blue/MorphoBlueSupplyCollateral.sol";
import { MorphoBlueBorrow } from "../../../contracts/actions/morpho-blue/MorphoBlueBorrow.sol";
import { MorphoBluePayback } from "../../../contracts/actions/morpho-blue/MorphoBluePayback.sol";
import { MarketParams } from "../../../contracts/interfaces/protocols/morpho-blue/IMorphoBlue.sol";

import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract TestMorphoBlueTargetRatioCheck is BaseTest, ActionsUtils {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MorphoBlueTargetRatioCheck cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    MorphoBlueSupplyCollateral supplyAction;
    MorphoBlueBorrow borrowAction;
    MorphoBluePayback paybackAction;
    SmartWallet wallet;
    address walletAddr;
    address sender;

    /// @dev Mirrors MorphoBlueTargetRatioCheck.RATIO_OFFSET (5% acceptable offset).
    uint256 internal constant RATIO_OFFSET = 5e16;

    /// @dev wstETH / WETH mainnet Morpho Blue market.
    MarketParams market;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new MorphoBlueTargetRatioCheck();
        supplyAction = new MorphoBlueSupplyCollateral();
        borrowAction = new MorphoBlueBorrow();
        paybackAction = new MorphoBluePayback();

        market = MarketParams({
            loanToken: Addresses.WETH_ADDR,
            collateralToken: Addresses.WSTETH_ADDR,
            oracle: 0xbD60A6770b27E084E8617335ddE769241B0e71D8,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 965_000_000_000_000_000
        });
    }

    /*//////////////////////////////////////////////////////////////////////////
                       FULL REPAY TESTS (targetRatio == 0)
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Full repay leaves the position with no debt, so the ratio is 0.
    ///         With `targetRatio == 0` the check must pass.
    function test_should_pass_full_repay_when_no_debt_left() public {
        _createPosition();

        uint256 startRatio = cut.getRatioUsingParams(market, walletAddr);
        assertGt(startRatio, 0, "Position should have debt before full repay");

        _fullPayback();

        uint256 currRatio = cut.getRatioUsingParams(market, walletAddr);
        assertEq(currRatio, 0, "Ratio should be 0 after full repay");

        // Should not revert: target is 0 and there is no debt left.
        wallet.execute(address(cut), _checkCalldata(0), 0);
    }

    /// @notice With `targetRatio == 0` but debt still present, the check must revert.
    function test_should_revert_full_repay_when_debt_left() public {
        _createPosition();

        uint256 currRatio = cut.getRatioUsingParams(market, walletAddr);
        assertGt(currRatio, 0, "Position should still have debt");

        vm.expectRevert(
            abi.encodeWithSelector(
                MorphoBlueTargetRatioCheck.BadAfterRatio.selector, currRatio, uint256(0)
            )
        );
        cut.executeAction(_encodeCheck(0), subData, paramMapping, returnValues);
    }

    /*//////////////////////////////////////////////////////////////////////////
                       NORMAL TARGET TESTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Non-zero target within the 5% offset still passes (the non full repay branch).
    function test_should_pass_normal_target_within_offset() public {
        _createPosition();

        uint256 currRatio = cut.getRatioUsingParams(market, walletAddr);
        // target == currRatio => trivially within the accepted offset.
        wallet.execute(address(cut), _checkCalldata(currRatio), 0);
    }

    /// @notice Non-zero target below the 5% offset must revert.
    function test_should_revert_normal_target_below_offset() public {
        _createPosition();

        uint256 currRatio = cut.getRatioUsingParams(market, walletAddr);
        // currRatio > targetRatio + RATIO_OFFSET => revert.
        uint256 targetRatio = currRatio - 2 * RATIO_OFFSET;

        vm.expectRevert(
            abi.encodeWithSelector(
                MorphoBlueTargetRatioCheck.BadAfterRatio.selector, currRatio, targetRatio
            )
        );
        cut.executeAction(_encodeCheck(targetRatio), subData, paramMapping, returnValues);
    }

    /// @notice Non-zero target above the 5% offset must revert.
    function test_should_revert_normal_target_above_offset() public {
        _createPosition();

        uint256 currRatio = cut.getRatioUsingParams(market, walletAddr);
        // currRatio < targetRatio - RATIO_OFFSET => revert.
        uint256 targetRatio = currRatio + 2 * RATIO_OFFSET;

        vm.expectRevert(
            abi.encodeWithSelector(
                MorphoBlueTargetRatioCheck.BadAfterRatio.selector, currRatio, targetRatio
            )
        );
        cut.executeAction(_encodeCheck(targetRatio), subData, paramMapping, returnValues);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    /// @dev Opens a 20 wstETH coll / 10 WETH debt Morpho Blue position owned by the wallet.
    function _createPosition() internal {
        uint256 collAmount = 20 ether;
        give(market.collateralToken, walletAddr, collAmount);
        wallet.execute(
            address(supplyAction),
            executeActionCalldata(
                abi.encode(
                    MorphoBlueSupplyCollateral.Params({
                        marketParams: market,
                        supplyAmount: collAmount,
                        from: walletAddr,
                        onBehalf: address(0)
                    })
                ),
                true
            ),
            0
        );

        uint256 borrowAmount = 10 ether;
        wallet.execute(
            address(borrowAction),
            executeActionCalldata(
                abi.encode(
                    MorphoBlueBorrow.Params({
                        marketParams: market,
                        borrowAmount: borrowAmount,
                        onBehalf: address(0),
                        to: walletAddr
                    })
                ),
                true
            ),
            0
        );
    }

    /// @dev Fully pays back the wallet's loan-token debt, leaving the collateral.
    function _fullPayback() internal {
        // Fund the wallet with more than the debt to cover any accrued interest.
        give(market.loanToken, walletAddr, 30 ether);
        wallet.execute(
            address(paybackAction),
            executeActionCalldata(
                abi.encode(
                    MorphoBluePayback.Params({
                        marketParams: market,
                        paybackAmount: type(uint256).max,
                        from: walletAddr,
                        onBehalf: address(0)
                    })
                ),
                true
            ),
            0
        );
    }

    function _encodeCheck(uint256 _targetRatio) internal view returns (bytes memory) {
        return abi.encode(
            MorphoBlueTargetRatioCheck.Params({
                marketParams: market, user: walletAddr, targetRatio: _targetRatio
            })
        );
    }

    function _checkCalldata(uint256 _targetRatio) internal view returns (bytes memory) {
        return executeActionCalldata(_encodeCheck(_targetRatio), false);
    }
}
