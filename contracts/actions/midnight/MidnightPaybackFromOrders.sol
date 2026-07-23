// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../interfaces/token/IERC20.sol";
import { OfferFill } from "../../interfaces/protocols/midnight/IMidnightBundlesV1.sol";

import { IdLib } from "../../_vendor/midnight/IdLib.sol";
import { TakeAmountsLib } from "../../_vendor/midnight/TakeAmountsLib.sol";
import { UtilsLib } from "../../_vendor/midnight/UtilsLib.sol";
import { ConsumableUnitsLib } from "../../_vendor/midnight/ConsumableUnitsLib.sol";
import { SafeERC20 } from "../../_vendor/openzeppelin/SafeERC20.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { MidnightHelper } from "./helpers/MidnightHelper.sol";

/// @title MidnightPaybackFromOrders
contract MidnightPaybackFromOrders is ActionBase, MidnightHelper {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    error CannotFulfillPayback(uint256 requiredAmount, uint256 filledAmount);
    error MinUnitsSlippage(uint256 minUnits, uint256 filledUnits);

    /// @param marketId Market id.
    /// @param onBehalf Address whose debt is repaid. Defaults to the user's wallet if not provided.
    /// @param from Address from which to pull the payback tokens.
    /// @param amount Amount of tokens to spend. Send type(uint).max to pay back the whole debt.
    /// @param minUnits Minimum number of debt units to repay (Slippage protection).
    /// @param offerFills Array of offer fills to pay back from.
    struct Params {
        bytes32 marketId;
        address onBehalf;
        address from;
        uint256 amount;
        uint256 minUnits;
        OfferFill[] offerFills;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.marketId =
            _parseParamABytes32(params.marketId, _paramMapping[0], _subData, _returnValues);
        params.onBehalf =
            _parseParamAddr(params.onBehalf, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
        params.minUnits =
            _parseParamUint(params.minUnits, _paramMapping[4], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _payback(params);
        emit ActionEvent("MidnightPaybackFromOrders", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(params);
        logger.logActionDirectEvent("MidnightPaybackFromOrders", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _payback(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.offerFills.length == 0) revert NoOrdersProvided();
        if (_params.amount == 0) revert ZeroAmountRequested();

        _params.onBehalf = _params.onBehalf == address(0) ? address(this) : _params.onBehalf;

        uint256 debt = MIDNIGHT.debt(_params.marketId, _params.onBehalf);
        _params.amount = UtilsLib.min(_params.amount, debt);

        address loanToken = _params.offerFills[0].offer.market.loanToken;
        loanToken.pullTokensIfNeeded(_params.from, _params.amount);
        loanToken.approveToken(address(MIDNIGHT), _params.amount);

        (uint256 filledUnits, uint256 filledPaybackAmount) = _fillOrders(_params, debt);

        if (
            filledPaybackAmount != _params.amount
                && MIDNIGHT.debt(_params.marketId, _params.onBehalf) != 0
        ) {
            revert CannotFulfillPayback(_params.amount, filledPaybackAmount);
        }
        if (filledUnits < _params.minUnits) {
            revert MinUnitsSlippage(_params.minUnits, filledUnits);
        }

        IERC20(loanToken).safeApprove(address(MIDNIGHT), 0);
        if (filledPaybackAmount != _params.amount) {
            loanToken.withdrawTokens(_params.from, _params.amount - filledPaybackAmount);
        }

        bytes memory logData = abi.encode(
            _params.marketId,
            _params.onBehalf,
            _params.from,
            _params.amount,
            _params.minUnits,
            filledUnits,
            filledPaybackAmount,
            loanToken
        );

        return (filledPaybackAmount, logData);
    }

    function _fillOrders(Params memory _params, uint256 _remainingDebt)
        internal
        returns (uint256 filledUnits, uint256 filledPaybackAmount)
    {
        for (
            uint256 i = 0;
            i < _params.offerFills.length && filledPaybackAmount < _params.amount
                && _remainingDebt > 0;
            ++i
        ) {
            OfferFill memory offerFill = _params.offerFills[i];

            if (offerFill.offer.buy) revert InvalidOfferType();
            if (IdLib.toId(offerFill.offer.market) != _params.marketId) {
                revert InvalidOfferMarketId();
            }

            uint256 leftUnitsToTake = TakeAmountsLib.buyerAssetsToUnits(
                address(MIDNIGHT),
                _params.marketId,
                offerFill.offer,
                _params.amount - filledPaybackAmount
            );

            uint256 consumableUnits = ConsumableUnitsLib.consumableUnits(
                address(MIDNIGHT), _params.marketId, offerFill.offer
            );

            uint256 unitsToTake =
                UtilsLib.min(leftUnitsToTake, consumableUnits, offerFill.units, _remainingDebt);

            if (unitsToTake == 0) continue;

            try MIDNIGHT.take(
                offerFill.offer,
                offerFill.ratifierData,
                unitsToTake,
                _params.onBehalf,
                address(0),
                address(0),
                ""
            ) returns (
                uint256 paybackAmount, uint256
            ) {
                filledUnits += unitsToTake;
                filledPaybackAmount += paybackAmount;
                _remainingDebt = MIDNIGHT.debt(_params.marketId, _params.onBehalf);
            } catch { }
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
