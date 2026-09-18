// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IConfigPositionManager
} from "../../interfaces/protocols/aaveV4/IConfigPositionManager.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV4Helper } from "./helpers/AaveV4Helper.sol";

/// @title AaveV4DelegateSetUsingAsCollateral
/// @notice Approves a delegatee to set using as collateral on behalf of the wallet.
contract AaveV4DelegateSetUsingAsCollateral is ActionBase, AaveV4Helper {
    /// @param spoke Address of the spoke.
    /// @param delegatee Address that will receive the permission.
    /// @param permission Whether the delegatee can set using as collateral.
    struct Params {
        address spoke;
        address delegatee;
        bool permission;
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
        params.delegatee =
            _parseParamAddr(params.delegatee, _paramMapping[1], _subData, _returnValues);
        params.permission = _parseParamUint(
            params.permission ? 1 : 0, _paramMapping[2], _subData, _returnValues
        ) == 1;

        (uint256 permission, bytes memory logData) = _delegateSetUsingAsCollateral(params);
        emit ActionEvent("AaveV4DelegateSetUsingAsCollateral", logData);
        return bytes32(permission);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _delegateSetUsingAsCollateral(params);
        logger.logActionDirectEvent("AaveV4DelegateSetUsingAsCollateral", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _delegateSetUsingAsCollateral(Params memory _params)
        internal
        returns (uint256, bytes memory)
    {
        IConfigPositionManager(CONFIG_POSITION_MANAGER)
            .setCanSetUsingAsCollateralPermission(
                _params.spoke, _params.delegatee, _params.permission
            );
        return (_params.permission ? 1 : 0, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
