// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../ActionBase.sol";
import "../helpers/CurveHelper.sol";

contract CurveLockTime is ActionBase, CurveHelper {

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        uint256 unlockTime = parseInputs(_callData);
        
        _curveLockTime(unlockTime);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        uint256 unlockTime = parseInputs(_callData);
        _curveLockTime(unlockTime);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @notice Extends unlock time of locked Crv tokens
    /// @param _unlockTime new time of lock expiration
    function _curveLockTime(uint256 _unlockTime) internal {
        VotingEscrow.increase_unlock_time(_unlockTime);

        logger.Log(
            address(this),
            msg.sender,
            "CurveLockTime",
            abi.encode(_unlockTime)
        );
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (uint256 unlockTime) {
        unlockTime = abi.decode(_callData[0], (uint256));
    }
}