// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";

import { EulerV2Helper } from "./helpers/EulerV2Helper.sol";
import { IEVault, IBorrowing, IRiskManager } from "../../interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../interfaces/eulerV2/IEVC.sol";

/// @title Payback debt asset to a Euler vault using share tokens
contract EulerV2PaybackWithShares is ActionBase, EulerV2Helper {

    /// @param vault The address of the vault
    /// @param account The address of the Euler account for which debt is paid back, defaults to user's wallet
    /// @param from The address of the Euler account for which shares are burned to pay back debt for 'account', defaults to user's wallet
    /// @param amount The amount of asset tokens to be paid back (uint256.max for full debt repayment or up to the available deposit shares in 'from' account)
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

        (uint256 paybackAmount, bytes memory logData) = _paybackWithShares(params);
        emit ActionEvent("EulerV2PaybackWithShares", logData);
        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _paybackWithShares(params);
        logger.logActionDirectEvent("EulerV2PaybackWithShares", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _paybackWithShares(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.account == address(0)) {
            _params.account = address(this);
        }

        if (_params.from == address(0)) {
            _params.from = address(this);
        }

        bytes memory repayWithSharesCallData = abi.encodeCall(
            IBorrowing.repayWithShares,
            (_params.amount, _params.account)
        );

        bytes memory result = IEVC(EVC_ADDR).call(
            _params.vault,
            _params.from,
            0,
            repayWithSharesCallData
        );

        (, _params.amount) = abi.decode(result, (uint256, uint256));

        uint256 accountDebtAfter = IEVault(_params.vault).debtOf(_params.account);

        // When disabling controller, 'from' and 'account' should be controlled by the same owner
        // otherwise this will revert as authorization error on Euler side
        if (accountDebtAfter == 0) {
            IEVC(EVC_ADDR).call(
                _params.vault,
                _params.account,
                0,
                abi.encodeCall(IRiskManager.disableController, ())
            );
        }

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}