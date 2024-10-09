// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";

import { EulerV2Helper } from "./helpers/EulerV2Helper.sol";
import { IEVC } from "../../interfaces/eulerV2/IEVC.sol";

/// @title Switch if the account is in lock-down mode or not. When in lock-down mode, the account can't perform any authenticated actions
contract EulerV2LockDownModeSwitch is ActionBase, EulerV2Helper {

    /// @param enabled Whether to enable or disable the lock-down mode
    struct Params {
        bool enabled;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.enabled = _parseParamUint(params.enabled ? 1 : 0, _paramMapping[0], _subData, _returnValues) == 1;

        bytes memory logData = _lockDownModeSwitch(params);
        emit ActionEvent("EulerV2LockDownModeSwitch", logData);
        return bytes32(uint256(params.enabled ? 1 : 0));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _lockDownModeSwitch(params);
        logger.logActionDirectEvent("EulerV2LockDownModeSwitch", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _lockDownModeSwitch(Params memory _params) internal returns (bytes memory) {
        IEVC(EVC_ADDR).setLockdownMode(
            getAddressPrefixInternal(address(this)),
            _params.enabled
        );

        return abi.encode(_params.enabled);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}