// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { OfferFill } from "../../interfaces/protocols/midnight/IMidnightBundlesV1.sol";
import { Market, Offer } from "../../interfaces/protocols/midnight/IMidnight.sol";

import { IdLib } from "../../_vendor/midnight/IdLib.sol";
import { TakeAmountsLib } from "../../_vendor/midnight/TakeAmountsLib.sol";
import { UtilsLib } from "../../_vendor/midnight/UtilsLib.sol";
import { ConsumableUnitsLib } from "../../_vendor/midnight/ConsumableUnitsLib.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { MidnightHelper } from "./helpers/MidnightHelper.sol";

/// @title MidnightBorrowFromOrders
contract MidnightBorrowFromOrders is ActionBase, MidnightHelper {
    using TokenUtils for address;

    error CannotFulfillBorrow(uint256 requiredAmount, uint256 filledAmount);
    error MaxUnitsSlippage(uint256 maxUnits, uint256 filledUnits);

    /// @param marketId Market id.
    /// @param onBehalf Address to borrow tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param to Address to send the borrowed tokens to.
    /// @param amount Amount of tokens to borrow.
    /// @param maxUnits Maximum number of units to take from the orders (Slippage protection)
    /// @param offerFills Array of offer fills to borrow from.
    struct Params {
        bytes32 marketId;
        address onBehalf;
        address to;
        uint256 amount;
        uint256 maxUnits;
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
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
        params.maxUnits =
            _parseParamUint(params.maxUnits, _paramMapping[4], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _borrow(params);
        emit ActionEvent("MidnightBorrowFromOrders", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _borrow(params);
        logger.logActionDirectEvent("MidnightBorrowFromOrders", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _borrow(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.offerFills.length == 0) revert NoOrdersProvided();
        if (_params.amount == 0) revert ZeroAmountRequested();

        _params.onBehalf = _params.onBehalf == address(0) ? address(this) : _params.onBehalf;

        uint256 filledUnits;
        uint256 filledBorrowAmount;
        for (
            uint256 i = 0;
            i < _params.offerFills.length && filledBorrowAmount < _params.amount;
            ++i
        ) {
            OfferFill memory offerFill = _params.offerFills[i];

            if (!offerFill.offer.buy) revert InvalidOfferType();
            if (IdLib.toId(offerFill.offer.market) != _params.marketId) {
                revert InvalidOfferMarketId();
            }

            uint256 leftUnitsToTake = TakeAmountsLib.sellerAssetsToUnits(
                address(MIDNIGHT),
                _params.marketId,
                offerFill.offer,
                _params.amount - filledBorrowAmount
            );

            uint256 consumableUnits = ConsumableUnitsLib.consumableUnits(
                address(MIDNIGHT), _params.marketId, offerFill.offer
            );

            uint256 unitsToTake = UtilsLib.min(leftUnitsToTake, consumableUnits, offerFill.units);
            if (unitsToTake == 0) continue;

            try MIDNIGHT.take(
                offerFill.offer,
                offerFill.ratifierData,
                unitsToTake,
                _params.onBehalf,
                address(this),
                address(0),
                ""
            ) returns (
                uint256, uint256 borrowedAmount
            ) {
                filledUnits += unitsToTake;
                filledBorrowAmount += borrowedAmount;
            } catch { }
        }

        if (filledBorrowAmount != _params.amount) {
            revert CannotFulfillBorrow(_params.amount, filledBorrowAmount);
        }
        if (filledUnits > _params.maxUnits) revert MaxUnitsSlippage(_params.maxUnits, filledUnits);

        address loanToken = _params.offerFills[0].offer.market.loanToken;

        loanToken.withdrawTokens(_params.to, _params.amount);

        bytes memory logData = abi.encode(
            _params.marketId,
            _params.onBehalf,
            _params.to,
            _params.amount,
            _params.maxUnits,
            filledUnits,
            loanToken
        );

        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
