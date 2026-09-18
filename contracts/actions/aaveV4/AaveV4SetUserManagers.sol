// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../interfaces/protocols/aaveV4/ISpoke.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title AaveV4SetUserManagers
/// @notice Sets position managers for the user's wallet.
contract AaveV4SetUserManagers is ActionBase {
    /// @param spoke Address of the spoke.
    /// @param updates The array of position manager updates.
    struct Params {
        address spoke;
        ISpoke.PositionManagerUpdate[] updates;
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

        bytes memory logData = _setUserManagers(params);
        emit ActionEvent("AaveV4SetUserManagers", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _setUserManagers(params);
        logger.logActionDirectEvent("AaveV4SetUserManagers", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _setUserManagers(Params memory _params) internal returns (bytes memory logData) {
        for (uint256 i = 0; i < _params.updates.length; ++i) {
            ISpoke(_params.spoke)
                .setUserPositionManager(
                    _params.updates[i].positionManager, _params.updates[i].approve
                );
        }

        logData = abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
