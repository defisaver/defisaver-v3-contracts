// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { Permission } from "../../auth/Permission.sol";
import { CheckWalletType } from "../../utils/CheckWalletType.sol";

/// @title Action to enable/disable smart wallet authorization
contract HandleAuth is ActionBase, Permission {
    /// @param enableAuth Whether to enable or disable authorization
    struct Params {
        bool enableAuth;
    }

    /// @inheritdoc ActionBase
    function executeAction(bytes memory _callData, bytes32[] memory, uint8[] memory, bytes32[] memory)
        public
        payable
        virtual
        override
        returns (bytes32)
    {
        Params memory inputData = parseInputs(_callData);
        handleAuth(inputData);
        return bytes32(0);
    }

    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        handleAuth(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function handleAuth(Params memory _inputData) internal {
        bool isDSProxy = isDSProxy(address(this));
        address authContract = isDSProxy ? PROXY_AUTH_ADDRESS : MODULE_AUTH_ADDRESS;

        if (_inputData.enableAuth) {
            isDSProxy ? giveProxyPermission(authContract) : enableModule(authContract);
        } else {
            isDSProxy ? removeProxyPermission(authContract) : disableModule(authContract);
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
