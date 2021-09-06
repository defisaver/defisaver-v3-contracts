// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../ActionBase.sol";
import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";

contract CurveLockAmount is ActionBase, CurveHelper {
    using TokenUtils for address;

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (address sender, uint256 amount) = parseInputs(_callData);
        amount = _parseParamUint(amount, _paramMapping[0], _subData, _returnValues);
        
        uint256 locked = _curveLockAmount(sender, amount);
        return bytes32(locked);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        (address sender, uint256 amount) = parseInputs(_callData);
        _curveLockAmount(sender, amount);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @notice Increases the amount of Crv tokens locked in the VotingEscrow contract
    /// @param _sender address where the tokens are pulled from
    /// @param _amount amount of additional tokens to lock
    function _curveLockAmount(address _sender, uint256 _amount) internal returns (uint256) {
        if (_amount == type(uint256).max) {
            _amount = CrvTokenAddr.getBalance(_sender);
        }

        CrvTokenAddr.pullTokensIfNeeded(_sender, _amount);
        VotingEscrow.increase_amount(_amount);

        logger.Log(
            address(this),
            msg.sender,
            "CurveLockAmount",
            abi.encode(
                _sender,
                _amount
            )
        );

        return _amount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (address sender,uint256 amount) {
        (sender, amount) = abi.decode(_callData[0], (address, uint256));
    }
}