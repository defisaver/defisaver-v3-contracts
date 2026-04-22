// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITakerPositionManager } from "../../interfaces/protocols/aaveV4/ITakerPositionManager.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV4Helper } from "./helpers/AaveV4Helper.sol";

/// @title AaveV4DelegateBorrowWithSig
/// @notice Approves a spender to borrow from the specified reserve using an EIP712-typed intent.
contract AaveV4DelegateBorrowWithSig is ActionBase, AaveV4Helper {
    /// @notice Structured parameters for borrow permit intent.
    /// @param permitData The structured BorrowPermit parameters.
    /// @param signature The EIP712-compliant signature bytes.
    struct Params {
        ITakerPositionManager.BorrowPermit permit;
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
        (uint256 amount, bytes memory logData) = _delegateBorrowWithSig(params);
        emit ActionEvent("AaveV4DelegateBorrowWithSig", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _delegateBorrowWithSig(params);
        logger.logActionDirectEvent("AaveV4DelegateBorrowWithSig", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _delegateBorrowWithSig(Params memory _params)
        internal
        returns (uint256, bytes memory)
    {
        ITakerPositionManager(TAKER_POSITION_MANAGER)
            .approveBorrowWithSig(_params.permit, _params.signature);
        return (_params.permit.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
