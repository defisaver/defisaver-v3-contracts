// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITakerPositionManager } from "../../interfaces/protocols/aaveV4/ITakerPositionManager.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV4Helper } from "./helpers/AaveV4Helper.sol";

/// @title AaveV4DelegateWithdrawWithSig
/// @notice Approves a spender to withdraw from the specified reserve using an EIP712-typed intent.
contract AaveV4DelegateWithdrawWithSig is ActionBase, AaveV4Helper {
    /// @notice Structured parameters for withdraw permit intent.
    /// @param permitData The structured WithdrawPermit parameters.
    /// @param signature The EIP712-compliant signature bytes.
    struct Params {
        ITakerPositionManager.WithdrawPermit permit;
        bytes signature;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        /// @dev Piping not supported for this action.
        (uint256 amount, bytes memory logData) = _delegateWithdrawWithSig(params);
        emit ActionEvent("AaveV4DelegateWithdrawWithSig", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _delegateWithdrawWithSig(params);
        logger.logActionDirectEvent("AaveV4DelegateWithdrawWithSig", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _delegateWithdrawWithSig(Params memory _params)
        internal
        returns (uint256, bytes memory)
    {
        ITakerPositionManager(TAKER_POSITION_MANAGER)
            .approveWithdrawWithSig(_params.permit, _params.signature);
        return (_params.permit.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
