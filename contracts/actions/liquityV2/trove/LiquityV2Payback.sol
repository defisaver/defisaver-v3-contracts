// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { IBorrowerOperations } from "../../../interfaces/protocols/liquityV2/IBorrowerOperations.sol";
import { ITroveManager } from "../../../interfaces/protocols/liquityV2/ITroveManager.sol";

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Payback a bold amount on a LiquityV2 trove on a specific market
contract LiquityV2Payback is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param from The address to pull the tokens from
    /// @param troveId The ID of the trove to payback the tokens to
    /// @param amount The amount of tokens to payback
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

        (uint256 amount, bytes memory logData) = _payback(params);
        emit ActionEvent("LiquityV2Payback", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(params);
        logger.logActionDirectEvent("LiquityV2Payback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _payback(Params memory _params) internal returns (uint256, bytes memory) {
        address troveManager = IAddressesRegistry(_params.market).troveManager();
        address borrowerOperations = IAddressesRegistry(_params.market).borrowerOperations();

        uint256 entireDebt = ITroveManager(troveManager).getLatestTroveData(_params.troveId).entireDebt;

        uint256 maxRepayment = entireDebt > MIN_DEBT ? entireDebt - MIN_DEBT : 0;

        if (_params.amount > maxRepayment) {
            _params.amount = maxRepayment;
        }

        BOLD_ADDR.pullTokensIfNeeded(_params.from, _params.amount);

        IBorrowerOperations(borrowerOperations).repayBold(_params.troveId, _params.amount);

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
