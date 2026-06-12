// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { CompV3RatioCheck } from "../../../contracts/actions/checkers/CompV3RatioCheck.sol";
import { CompV3Supply } from "../../../contracts/actions/compoundV3/CompV3Supply.sol";
import { CompV3Borrow } from "../../../contracts/actions/compoundV3/CompV3Borrow.sol";
import { CompV3Payback } from "../../../contracts/actions/compoundV3/CompV3Payback.sol";
import { IComet } from "../../../contracts/interfaces/protocols/compoundV3/IComet.sol";
import {
    TransientStorageCancun
} from "../../../contracts/utils/transient/TransientStorageCancun.sol";

import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { CompV3Encode } from "../../utils/encode/CompV3Encode.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract TestCompV3RatioCheck is BaseTest, ActionsUtils {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    CompV3RatioCheck cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    CompV3Supply supplyAction;
    CompV3Borrow borrowAction;
    CompV3Payback paybackAction;
    SmartWallet wallet;
    address walletAddr;
    address sender;

    address constant MARKET = Addresses.COMET_USDC;
    address constant COLL = Addresses.WETH_ADDR;
    address constant BASE = Addresses.USDC_ADDR;

    /// @dev Mirrors CompV3RatioCheck.RATIO_OFFSET (5% acceptable offset).
    uint256 internal constant RATIO_OFFSET = 5e16;
    string internal constant COMP_RATIO_KEY = "COMP_RATIO";

    TransientStorageCancun constant tempStorage =
        TransientStorageCancun(Addresses.TRANSIENT_STORAGE_CANCUN);

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new CompV3RatioCheck();
        supplyAction = new CompV3Supply();
        borrowAction = new CompV3Borrow();
        paybackAction = new CompV3Payback();
    }

    /*//////////////////////////////////////////////////////////////////////////
                       FULL REPAY TESTS (targetRatio == 0)
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Full repay leaves the position with no debt, so the safety ratio is 0.
    ///         With `targetRatio == 0` (IN_REPAY) the check must pass.
    function test_should_pass_full_repay_when_no_debt_left() public {
        _createPosition();

        uint256 startRatio = cut.getSafetyRatio(MARKET, walletAddr);
        assertGt(startRatio, 0, "Position should have debt before full repay");

        _fullPayback();

        uint256 currRatio = cut.getSafetyRatio(MARKET, walletAddr);
        assertEq(currRatio, 0, "Ratio should be 0 after full repay");

        tempStorage.setBytes32(COMP_RATIO_KEY, bytes32(startRatio));
        // Should not revert: target is 0 and there is no debt left.
        wallet.execute(
            address(cut), _ratioCheckCalldata(CompV3RatioCheck.RatioState.IN_REPAY, 0), 0
        );
    }

    /// @notice With `targetRatio == 0` but debt still present, the check must revert.
    function test_should_revert_full_repay_when_debt_left() public {
        _createPosition();

        uint256 currRatio = cut.getSafetyRatio(MARKET, walletAddr);
        assertGt(currRatio, 0, "Position should still have debt");

        uint256 startRatio = currRatio;
        tempStorage.setBytes32(COMP_RATIO_KEY, bytes32(startRatio));

        (bytes memory paramsCalldata, uint8[] memory pm) =
            _checkParams(CompV3RatioCheck.RatioState.IN_REPAY, 0);
        vm.expectRevert(
            abi.encodeWithSelector(CompV3RatioCheck.BadAfterRatio.selector, startRatio, currRatio)
        );
        cut.executeAction(paramsCalldata, subData, pm, returnValues);
    }

    /*//////////////////////////////////////////////////////////////////////////
                       NORMAL REPAY TESTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Non-zero target where the ratio improved and stays within offset must pass.
    function test_should_pass_normal_repay_within_offset() public {
        _createPosition();

        uint256 currRatio = cut.getSafetyRatio(MARKET, walletAddr);
        // startRatio < currRatio (repay improved it), target == currRatio (within offset).
        tempStorage.setBytes32(COMP_RATIO_KEY, bytes32(currRatio - 1e17));
        wallet.execute(
            address(cut), _ratioCheckCalldata(CompV3RatioCheck.RatioState.IN_REPAY, currRatio), 0
        );
    }

    /// @notice Repay that overshoots `target + offset` must revert
    function test_should_revert_normal_repay_overshoot() public {
        _createPosition();

        uint256 currRatio = cut.getSafetyRatio(MARKET, walletAddr);
        uint256 startRatio = currRatio - 1e17;
        uint256 targetRatio = currRatio - 2 * RATIO_OFFSET; // currRatio > targetRatio + offset

        tempStorage.setBytes32(COMP_RATIO_KEY, bytes32(startRatio));
        (bytes memory paramsCalldata, uint8[] memory pm) =
            _checkParams(CompV3RatioCheck.RatioState.IN_REPAY, targetRatio);
        vm.expectRevert(
            abi.encodeWithSelector(CompV3RatioCheck.BadAfterRatio.selector, startRatio, currRatio)
        );
        cut.executeAction(paramsCalldata, subData, pm, returnValues);
    }

    /// @notice Repay that does not improve the ratio (currRatio <= startRatio) must revert.
    function test_should_revert_normal_repay_no_improvement() public {
        _createPosition();

        uint256 currRatio = cut.getSafetyRatio(MARKET, walletAddr);
        uint256 startRatio = currRatio;

        tempStorage.setBytes32(COMP_RATIO_KEY, bytes32(startRatio));
        (bytes memory paramsCalldata, uint8[] memory pm) =
            _checkParams(CompV3RatioCheck.RatioState.IN_REPAY, currRatio);
        vm.expectRevert(
            abi.encodeWithSelector(CompV3RatioCheck.BadAfterRatio.selector, startRatio, currRatio)
        );
        cut.executeAction(paramsCalldata, subData, pm, returnValues);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    /// @dev Opens a ~100k coll / ~40k debt Compound V3 position owned by the wallet.
    function _createPosition() internal {
        uint256 collAmount = amountInUSDPrice(COLL, 100_000);
        give(COLL, walletAddr, collAmount);
        wallet.execute(
            address(supplyAction),
            executeActionCalldata(CompV3Encode.supply(MARKET, COLL, collAmount, walletAddr), true),
            0
        );

        uint256 borrowAmount = amountInUSDPrice(BASE, 40_000);
        wallet.execute(
            address(borrowAction),
            executeActionCalldata(CompV3Encode.borrow(MARKET, borrowAmount, walletAddr), true),
            0
        );
    }

    /// @dev Fully pays back the wallet's base-token debt, leaving the collateral.
    function _fullPayback() internal {
        uint256 debt = IComet(MARKET).borrowBalanceOf(walletAddr);
        // Fund the wallet with more than the debt to cover any accrued interest.
        give(BASE, walletAddr, debt * 2);
        wallet.execute(
            address(paybackAction),
            executeActionCalldata(
                CompV3Encode.payback(MARKET, walletAddr, type(uint256).max), true
            ),
            0
        );
        assertEq(IComet(MARKET).borrowBalanceOf(walletAddr), 0, "Debt not fully repaid");
    }

    /// @dev Calldata to run the check through the wallet (delegatecall => user defaults to wallet).
    function _ratioCheckCalldata(CompV3RatioCheck.RatioState _state, uint256 _targetRatio)
        internal
        view
        returns (bytes memory)
    {
        return executeActionCalldata(
            CompV3Encode.ratioCheck(uint8(_state), _targetRatio, MARKET), false
        );
    }

    /// @dev Builds the check params (with user = wallet) and a length-4 paramMapping so the
    ///      action honors the `user` param when the check is called directly.
    function _checkParams(CompV3RatioCheck.RatioState _state, uint256 _targetRatio)
        internal
        view
        returns (bytes memory paramsCalldata, uint8[] memory pm)
    {
        paramsCalldata = abi.encode(
            CompV3RatioCheck.Params({
                ratioState: _state, targetRatio: _targetRatio, market: MARKET, user: walletAddr
            })
        );
        pm = new uint8[](4);
    }
}
