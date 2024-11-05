// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";

import { EulerV2Helper } from "./helpers/EulerV2Helper.sol";
import { IEVC } from "../../interfaces/eulerV2/IEVC.sol";

/// @title Switch if vault will be used as collateral or not
contract EulerV2CollateralSwitch is ActionBase, EulerV2Helper {

    /// @param vault The address of the vault
    /// @param account The address of the Euler account, defaults to user's wallet
    /// @param enableAsColl Whether to enable or disable the vault as collateral
    struct Params {
        address vault;
        address account;
        bool enableAsColl;
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
        params.enableAsColl = _parseParamUint(params.enableAsColl ? 1 : 0, _paramMapping[2], _subData, _returnValues) == 1;

        bytes memory logData = _collateralSwitch(params);
        emit ActionEvent("EulerV2CollateralSwitch", logData);
        return bytes32(uint256(params.enableAsColl ? 1 : 0));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _collateralSwitch(params);
        logger.logActionDirectEvent("EulerV2CollateralSwitch", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _collateralSwitch(Params memory _params) internal returns (bytes memory) {
        if (_params.account == address(0)) {
            _params.account = address(this);
        }

        if (_params.enableAsColl) {
            IEVC(EVC_ADDR).enableCollateral(_params.account, _params.vault);
        } else {
            IEVC(EVC_ADDR).disableCollateral(_params.account, _params.vault);
        }

        return abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}