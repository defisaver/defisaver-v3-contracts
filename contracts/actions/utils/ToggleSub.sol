// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { SubStorage } from "../../core/strategy/SubStorage.sol";
import { Permission } from "../../auth/Permission.sol";

/// @title ToggleSub - Sets the state of the sub to active or deactivated.
/// @notice User can only disable/enable his own subscriptions.
contract ToggleSub is ActionBase, Permission {
    /// @param subId ID of the subscription to toggle
    /// @param active Whether to activate or deactivate the subscription
    struct Params {
        uint256 subId;
        bool active;
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

        updateSubData(inputData);

        return (bytes32(inputData.subId));
    }

    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        updateSubData(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function updateSubData(Params memory _inputData) internal {
        if (_inputData.active) {
            /// @notice This gives permission to dsproxy or safe to our auth contract to be able to execute the strategy.
            giveWalletPermission(isDSProxy(address(this)));
            SubStorage(SUB_STORAGE_ADDR).activateSub(_inputData.subId);
        } else {
            SubStorage(SUB_STORAGE_ADDR).deactivateSub(_inputData.subId);
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
