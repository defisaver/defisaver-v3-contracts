// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IConfigPositionManager
} from "../../interfaces/protocols/aaveV4/IConfigPositionManager.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV4Helper } from "./helpers/AaveV4Helper.sol";

/// @title AaveV4DelegateSetUsingAsCollateralWithSig
/// @notice Approves a delegatee to set using as collateral on behalf of delegator with EIP712 signature.
contract AaveV4DelegateSetUsingAsCollateralWithSig is ActionBase, AaveV4Helper {
    /// @notice Structured parameters for set-using-as-collateral permission permit intent.
    /// @param permit The structured SetCanSetUsingAsCollateralPermissionPermit parameters.
    /// @param signature The EIP712-compliant signature bytes.
    struct Params {
        IConfigPositionManager.SetCanSetUsingAsCollateralPermissionPermit permit;
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
        (uint256 permission, bytes memory logData) = _delegateSetUsingAsCollateralWithSig(params);
        emit ActionEvent("AaveV4DelegateSetUsingAsCollateralWithSig", logData);
        return bytes32(permission);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _delegateSetUsingAsCollateralWithSig(params);
        logger.logActionDirectEvent("AaveV4DelegateSetUsingAsCollateralWithSig", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _delegateSetUsingAsCollateralWithSig(Params memory _params)
        internal
        returns (uint256, bytes memory)
    {
        IConfigPositionManager(CONFIG_POSITION_MANAGER)
            .setCanSetUsingAsCollateralPermissionWithSig(_params.permit, _params.signature);
        return (_params.permit.permission ? 1 : 0, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
