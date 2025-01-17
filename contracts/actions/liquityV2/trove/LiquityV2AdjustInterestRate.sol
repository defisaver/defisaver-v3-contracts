// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../interfaces/liquityV2/IAddressesRegistry.sol";
import { IBorrowerOperations } from "../../../interfaces/liquityV2/IBorrowerOperations.sol";

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";

/// @title Adjust the interest rate of a LiquityV2 trove on a specific market
contract LiquityV2AdjustInterestRate is ActionBase, LiquityV2Helper {

    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param troveId The ID of the trove to adjust the interest rate of
    /// @param newAnnualInterestRate The new annual interest rate for the trove
    ///                              (in 1e16) - 50000000000000000 => 5% annual interest
    /// @param upperHint The upper hint for the trove
    /// @param lowerHint The lower hint for the trove
    /// @param maxUpfrontFee The maximum upfront fee to pay (see IHintHelpers:predictAdjustTroveUpfrontFee)
    struct Params {
        address market;
        uint256 troveId;
        uint256 newAnnualInterestRate;
        uint256 upperHint;
        uint256 lowerHint;
        uint256 maxUpfrontFee;
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
        params.troveId = _parseParamUint(params.troveId, _paramMapping[1], _subData, _returnValues);
        params.newAnnualInterestRate = _parseParamUint(params.newAnnualInterestRate, _paramMapping[2], _subData, _returnValues);
        params.upperHint = _parseParamUint(params.upperHint, _paramMapping[3], _subData, _returnValues);
        params.lowerHint = _parseParamUint(params.lowerHint, _paramMapping[4], _subData, _returnValues);
        params.maxUpfrontFee = _parseParamUint(params.maxUpfrontFee, _paramMapping[5], _subData, _returnValues);

        (uint256 newInterestRate, bytes memory logData) = _adjustInterestRate(params);
        emit ActionEvent("LiquityV2AdjustInterestRate", logData);
        return bytes32(newInterestRate);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _adjustInterestRate(params);
        logger.logActionDirectEvent("LiquityV2AdjustInterestRate", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _adjustInterestRate(Params memory _params) internal returns (uint256, bytes memory) {
        address borrowerOperations = IAddressesRegistry(_params.market).borrowerOperations();

        IBorrowerOperations(borrowerOperations).adjustTroveInterestRate(
            _params.troveId,
            _params.newAnnualInterestRate,
            _params.upperHint,
            _params.lowerHint,
            _params.maxUpfrontFee
        );

        return (_params.newAnnualInterestRate, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
