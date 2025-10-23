// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { Permission } from "../../auth/Permission.sol";

/// @title Action to enable/disable smart wallet authorization
contract HandleAuth is ActionBase, Permission {

    /// @param enableAuth Whether to enable or disable authorization
    struct Params {
        bool enableAuth;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public virtual override payable returns (bytes32) {
        Params memory inputData = parseInputs(_callData);
        handleAuth(inputData);
        return bytes32(0);
    }

    function executeActionDirect(bytes memory _callData) public override payable {
        Params memory inputData = parseInputs(_callData);
        handleAuth(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
   
    function handleAuth(Params memory _inputData) internal {
        _inputData.enableAuth
            ? _giveAuthContractPermission(_getWalletType(address(this)))
            : _removeAuthContractPermission(_getWalletType(address(this)));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
