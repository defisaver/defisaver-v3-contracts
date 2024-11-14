// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../interfaces/liquityV2/IAddressesRegistry.sol";
import { IBorrowerOperations } from "../../../interfaces/liquityV2/IBorrowerOperations.sol";
import { ITroveManager } from "../../../interfaces/liquityV2/ITroveManager.sol";

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Adjusts a zombie trove on a specific market
/// @dev For this action to work:
/// 1. The trove has to be in Zombie state (it's removed from the list)
/// 2. New trove debt after adjustment must be at least MIN_DEBT
contract LiquityV2AdjustZombieTrove is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    enum CollActionType { SUPPLY, WITHDRAW }
    enum DebtActionType { PAYBACK, BORROW }

    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param from The address to pull the tokens from
    /// @param to The address to send the tokens to
    /// @param troveId The ID of the trove to adjust
    /// @param collAmount The amount of collateral to supply or withdraw
    /// @param debtAmount The amount of debt to payback or borrow
    /// @param upperHint The upper hint for the trove
    /// @param lowerHint The lower hint for the trove
    /// @param maxUpfrontFee The maximum upfront fee to pay (see IHintHelpers:predictAdjustTroveUpfrontFee)
    /// @param collAction The type of collateral action to perform. 0 for supply, 1 for withdraw
    /// @param debtAction The type of debt action to perform. 0 for payback, 1 for borrow
    struct Params {
        address market;
        address from;
        address to;
        uint256 troveId;
        uint256 collAmount;
        uint256 debtAmount;
        uint256 upperHint;
        uint256 lowerHint;
        uint256 maxUpfrontFee;
        CollActionType collAction;
        DebtActionType debtAction;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.troveId = _parseParamUint(params.troveId, _paramMapping[3], _subData, _returnValues);
        params.collAmount = _parseParamUint(params.collAmount, _paramMapping[4], _subData, _returnValues);
        params.debtAmount = _parseParamUint(params.debtAmount, _paramMapping[5], _subData, _returnValues);
        params.upperHint = _parseParamUint(params.upperHint, _paramMapping[6], _subData, _returnValues);
        params.lowerHint = _parseParamUint(params.lowerHint, _paramMapping[7], _subData, _returnValues);
        params.maxUpfrontFee = _parseParamUint(params.maxUpfrontFee, _paramMapping[8], _subData, _returnValues);
        params.collAction = CollActionType(_parseParamUint(uint8(params.collAction), _paramMapping[9], _subData, _returnValues));
        params.debtAction = DebtActionType(_parseParamUint(uint8(params.debtAction), _paramMapping[10], _subData, _returnValues));

        (uint256 debtAmount, bytes memory logData) = _adjust(params);
        emit ActionEvent("LiquityV2AdjustZombieTrove", logData);
        return bytes32(debtAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _adjust(params);
        logger.logActionDirectEvent("LiquityV2AdjustZombieTrove", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _adjust(Params memory _params) internal returns (uint256, bytes memory) {
        address collToken = IAddressesRegistry(_params.market).collToken();
        address borrowerOperations = IAddressesRegistry(_params.market).borrowerOperations();

        if (_params.collAction == CollActionType.SUPPLY) {
            _params.collAmount = collToken.pullTokensIfNeeded(_params.from, _params.collAmount);
            collToken.approveToken(borrowerOperations, _params.collAmount);
        }

        if (_params.debtAction == DebtActionType.PAYBACK) {
            address troveManager = IAddressesRegistry(_params.market).troveManager();

            uint256 entireDebt = ITroveManager(troveManager)
                .getLatestTroveData(_params.troveId).entireDebt;

            uint256 maxRepayment = entireDebt > MIN_DEBT ? entireDebt - MIN_DEBT : 0;

            if (_params.debtAmount > maxRepayment) {
                _params.debtAmount = maxRepayment;
            }

            BOLD_ADDR.pullTokensIfNeeded(_params.from, _params.debtAmount);
        }

        IBorrowerOperations(borrowerOperations).adjustZombieTrove(
            _params.troveId,
            _params.collAmount,
            _params.collAction == CollActionType.SUPPLY,
            _params.debtAmount,
            _params.debtAction == DebtActionType.BORROW,
            _params.upperHint,
            _params.lowerHint,
            _params.maxUpfrontFee
        );

        if (_params.collAction == CollActionType.WITHDRAW) {
            collToken.withdrawTokens(_params.to, _params.collAmount);
        }

        if (_params.debtAction == DebtActionType.BORROW) {
            BOLD_ADDR.withdrawTokens(_params.to, _params.debtAmount);
        }

        return (_params.debtAmount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
