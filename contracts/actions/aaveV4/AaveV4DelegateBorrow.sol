// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITakerPositionManager } from "../../interfaces/protocols/aaveV4/ITakerPositionManager.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV4Helper } from "./helpers/AaveV4Helper.sol";

/// @title AaveV4DelegateBorrow
/// @notice Approves a spender to borrow from the specified reserve on behalf of the wallet.
contract AaveV4DelegateBorrow is ActionBase, AaveV4Helper {
    /// @param spoke Address of the spoke.
    /// @param reserveId Reserve id.
    /// @param spender Address that will receive the borrow allowance.
    /// @param amount Amount of borrow allowance.
    struct Params {
        address spoke;
        uint256 reserveId;
        address spender;
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

        params.spoke = _parseParamAddr(params.spoke, _paramMapping[0], _subData, _returnValues);
        params.reserveId =
            _parseParamUint(params.reserveId, _paramMapping[1], _subData, _returnValues);
        params.spender = _parseParamAddr(params.spender, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _delegateBorrow(params);
        emit ActionEvent("AaveV4DelegateBorrow", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _delegateBorrow(params);
        logger.logActionDirectEvent("AaveV4DelegateBorrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _delegateBorrow(Params memory _params) internal returns (uint256, bytes memory) {
        ITakerPositionManager(TAKER_POSITION_MANAGER)
            .approveBorrow(_params.spoke, _params.reserveId, _params.spender, _params.amount);
        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
