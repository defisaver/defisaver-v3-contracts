// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../interfaces/protocols/aaveV4/ISpoke.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title AaveV4SetUserManagersWithSig
/// @notice Sets user position managers with EIP712-typed signature.
contract AaveV4SetUserManagersWithSig is ActionBase {
    /// @param spoke Address of the spoke.
    /// @param onBehalf The address of the user on whose behalf position manager can act.
    /// @param nonce The nonce for the signature.
    /// @param deadline The deadline for the signature.
    /// @param signature The signature bytes.
    /// @param updates The array of position manager updates.
    struct Params {
        address spoke;
        address onBehalf;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
        ISpoke.PositionManagerUpdate[] updates;
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
        bytes memory logData = _setUserManagersWithSig(params);

        emit ActionEvent("AaveV4SetUserManagersWithSig", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _setUserManagersWithSig(params);
        logger.logActionDirectEvent("AaveV4SetUserManagersWithSig", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _setUserManagersWithSig(Params memory _params)
        internal
        returns (bytes memory logData)
    {
        ISpoke.SetUserPositionManagers memory setManagersData =
            ISpoke.SetUserPositionManagers({
                onBehalfOf: _params.onBehalf,
                updates: _params.updates,
                nonce: _params.nonce,
                deadline: _params.deadline
            });

        ISpoke(_params.spoke).setUserPositionManagersWithSig(setManagersData, _params.signature);
        logData = abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
