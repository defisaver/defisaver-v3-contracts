// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

import { IAddressesRegistry } from "../../../interfaces/liquityV2/IAddressesRegistry.sol";
import { IBorrowerOperations } from "../../../interfaces/liquityV2/IBorrowerOperations.sol";

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Supplies a token to a LiquityV2 trove on a specific market
contract LiquityV2Supply is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param from The address to pull the tokens from
    /// @param troveId The ID of the trove to supply the tokens to
    /// @param amount The amount of tokens to supply
    struct Params {
        address market;
        address from;
        uint256 troveId;
        uint256 amount;
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
        params.troveId = _parseParamUint(params.troveId, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _supply(params);
        emit ActionEvent("LiquityV2Supply", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params);
        logger.logActionDirectEvent("LiquityV2Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _supply(Params memory _params) internal returns (uint256, bytes memory) {
        address collToken = IAddressesRegistry(_params.market).collToken();

        _params.amount = collToken.pullTokensIfNeeded(_params.from, _params.amount);

        address borrowerOperations = IAddressesRegistry(_params.market).borrowerOperations();

        collToken.approveToken(borrowerOperations, _params.amount);

        IBorrowerOperations(borrowerOperations).addColl(
            _params.troveId,
            _params.amount
        );

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
