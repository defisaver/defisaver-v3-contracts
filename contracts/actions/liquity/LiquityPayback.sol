// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../interfaces/liquity/IBorrowerOperations.sol";
import "../ActionBase.sol";

contract LiquityPayback is ActionBase {

    address constant _borrowerOperations = 0x24179CD81c9e782A4096035f7eC97fB8B783e007;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint _LUSDAmount, address _upperHint, address _lowerHint) = parseInputs(_callData);

        _LUSDAmount = _parseParamUint(_LUSDAmount, _paramMapping[0], _subData, _returnValues);

        _LUSDAmount = _liquityPayback(_LUSDAmount, _upperHint, _lowerHint);
        return bytes32(_LUSDAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (uint _LUSDAmount, address _upperHint, address _lowerHint) = parseInputs(_callData);

        _liquityPayback(_LUSDAmount, _upperHint, _lowerHint);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Repay LUSD tokens to a Trove: Burn the repaid LUSD tokens, and reduce the trove's debt accordingly
    function _liquityPayback(uint _LUSDAmount, address _upperHint, address _lowerHint) internal returns (uint256) {
        IBorrowerOperations(_borrowerOperations).repayLUSD(_LUSDAmount, _upperHint, _lowerHint);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityPayback",
            abi.encode(_LUSDAmount)
        );

        return _LUSDAmount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (uint _LUSDAmount, address _upperHint, address _lowerHint)
    {
        _LUSDAmount = abi.decode(_callData[0], (uint256));
        _upperHint = abi.decode(_callData[1], (address));
        _lowerHint = abi.decode(_callData[2], (address));
    }
}