// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

import { EulerV2Helper } from "./helpers/EulerV2Helper.sol";
import { IEVault, IRiskManager } from "../../interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../interfaces/eulerV2/IEVC.sol";

/// @title Payback debt assets to a Euler vault
contract EulerV2Payback is ActionBase, EulerV2Helper {
    using TokenUtils for address;

    /// @param vault The address of the vault
    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param from The address from which to pull tokens to be paid back
    /// @param amount The amount of assets to pay back (uint256.max for full debt repayment)
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

        (uint256 paybackAmount, bytes memory logData) = _payback(params);
        emit ActionEvent("EulerV2Payback", logData);
        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(params);
        logger.logActionDirectEvent("EulerV2Payback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _payback(Params memory _params) internal returns (uint256, bytes memory) {
        address assetAddr = IEVault(_params.vault).asset();

        if (_params.account == address(0)) {
            _params.account = address(this);
        }

        bool maxPayback;

        uint256 currentAccountDebt = IEVault(_params.vault).debtOf(_params.account);
        if (_params.amount > currentAccountDebt) {
            _params.amount = currentAccountDebt;
            maxPayback = true;
        }

        assetAddr.pullTokensIfNeeded(_params.from, _params.amount);
        assetAddr.approveToken(_params.vault, _params.amount);

        _params.amount = IEVault(_params.vault).repay(_params.amount, _params.account);

        if (maxPayback) {
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