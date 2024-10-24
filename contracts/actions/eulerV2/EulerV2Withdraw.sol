// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";

import { IERC4626 } from "../../interfaces/eulerV2/IEVault.sol";
import { IEVC } from "../../interfaces/eulerV2/IEVC.sol";
import { EulerV2Helper } from "./helpers/EulerV2Helper.sol";

/// @title Withdraws assets from Euler vault
contract EulerV2Withdraw is ActionBase, EulerV2Helper {

    /// @param vault The address of the Euler vault
    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param receiver The address to receive the withdrawn assets
    /// @param amount The amount of assets to withdraw (uint256.max for max withdrawal)
    struct Params {
        address vault;
        address account;
        address receiver;
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
        params.receiver = _parseParamAddr(params.receiver, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
   
        (uint256 withdrawAmount, bytes memory logData) = _withdraw(params);
        emit ActionEvent("EulerV2Withdraw", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent("EulerV2Withdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _withdraw(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.account == address(0)) {
            _params.account = address(this);
        }

        bytes4 vaultActionSelector = _params.amount == type(uint256).max ?
            IERC4626.redeem.selector : IERC4626.withdraw.selector;

        bytes memory vaultCallData = abi.encodeWithSelector(
            vaultActionSelector,
            _params.amount,
            _params.receiver,
            _params.account
        );

        bytes memory result = IEVC(EVC_ADDR).call(
            _params.vault,
            _params.account,
            0,
            vaultCallData
        );

        if (_params.amount == type(uint256).max) {
            _params.amount = abi.decode(result, (uint256));
        }

        return (_params.amount,  abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
