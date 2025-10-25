// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { IBorrowerOperations } from "../../../interfaces/protocols/liquityV2/IBorrowerOperations.sol";

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";

/// @title Borrows a bold amount from a LiquityV2 trove on a specific market
contract LiquityV2Borrow is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param to The address to send the tokens to
    /// @param troveId The ID of the trove to borrow the tokens from
    /// @param amount The amount of tokens to borrow
    /// @param maxUpfrontFee The maximum upfront fee to pay (see IHintHelpers:predictAdjustTroveUpfrontFee)
    struct Params {
        address market;
        address to;
        uint256 troveId;
        uint256 amount;
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.troveId = _parseParamUint(params.troveId, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
        params.maxUpfrontFee = _parseParamUint(params.maxUpfrontFee, _paramMapping[4], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _borrow(params);
        emit ActionEvent("LiquityV2Borrow", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _borrow(params);
        logger.logActionDirectEvent("LiquityV2Borrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _borrow(Params memory _params) internal returns (uint256, bytes memory) {
        address borrowerOperations = IAddressesRegistry(_params.market).borrowerOperations();

        IBorrowerOperations(borrowerOperations).withdrawBold(_params.troveId, _params.amount, _params.maxUpfrontFee);

        BOLD_ADDR.withdrawTokens(_params.to, _params.amount);

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
