// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";

import { EulerV2Helper } from "./helpers/EulerV2Helper.sol";
import { IBorrowing } from "../../interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../interfaces/eulerV2/IEVC.sol";

/// @title Pull debt from one Euler account to another
contract EulerV2PullDebt is ActionBase, EulerV2Helper {

    /// @param vault The address of the Euler vault
    /// @param account The address of the Euler account taking the debt, defaults to user's wallet
    /// @param from The address of the Euler account from which debt is pulled
    /// @param amount The amount of debt to be pulled (uint256.max for full debt pull)
    struct Params {
        address vault;
        address account;
        address from;
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

        params.vault = _parseParamAddr(params.vault, _paramMapping[0], _subData, _returnValues);
        params.account = _parseParamAddr(params.account, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);

        (uint256 pulledDebtAmount, bytes memory logData) = _pullDebt(params);
        emit ActionEvent("EulerV2PullDebt", logData);
        return bytes32(pulledDebtAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _pullDebt(params);
        logger.logActionDirectEvent("EulerV2PullDebt", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _pullDebt(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.account == address(0)) {
            _params.account = address(this);
        }

        bool isControllerEnabled = IEVC(EVC_ADDR).isControllerEnabled(_params.account, _params.vault);

        if (!isControllerEnabled) {
            IEVC(EVC_ADDR).enableController(_params.account, _params.vault);
        }

        bytes memory pullDebtCallData = abi.encodeCall(
            IBorrowing.pullDebt,
            (_params.amount, _params.from)
        );

        uint256 accountDebtBefore = IBorrowing(_params.vault).debtOf(_params.account);

        IEVC(EVC_ADDR).call(
            _params.vault,
            _params.account,
            0,
            pullDebtCallData
        );

        uint256 accountDebtAfter = IBorrowing(_params.vault).debtOf(_params.account);

        _params.amount = accountDebtAfter - accountDebtBefore;

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}