// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../interfaces/liquity/IBorrowerOperations.sol";
import "../ActionBase.sol";

contract LiquityOpen is ActionBase {

    address constant BorrowerOperationsAddr = 0x24179CD81c9e782A4096035f7eC97fB8B783e007;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (
            uint256 maxFeePercentage,
            uint256 collAmount,
            uint256 LUSDAmount,
            address upperHint,
            address lowerHint
        )= parseInputs(_callData);

        maxFeePercentage = _parseParamUint(maxFeePercentage, _paramMapping[0], _subData, _returnValues);
        collAmount = _parseParamUint(collAmount, _paramMapping[1], _subData, _returnValues);
        LUSDAmount = _parseParamUint(LUSDAmount, _paramMapping[2], _subData, _returnValues);

        uint256 troveOwner = _liquityOpen(maxFeePercentage, collAmount, LUSDAmount, upperHint, lowerHint);
        return bytes32(troveOwner);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (
            uint256 maxFeePercentage,
            uint256 collAmount,
            uint256 LUSDAmount,
            address upperHint,
            address lowerHint
        )= parseInputs(_callData);

        _liquityOpen(maxFeePercentage, collAmount, LUSDAmount, upperHint, lowerHint);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Opens up an empty trove
    function _liquityOpen(uint256 _maxFeePercentage, uint256 _collAmount, uint256 _LUSDAmount, address _upperHint, address _lowerHint) internal returns (uint256) {
        IBorrowerOperations(BorrowerOperationsAddr).openTrove{value: _collAmount}(_maxFeePercentage, _LUSDAmount, _upperHint, _lowerHint);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityOpen",
            abi.encode(_maxFeePercentage, _collAmount, _LUSDAmount)
        );

        return uint256(msg.sender);
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 maxFeePercentage,
            uint256 collAmount,
            uint256 LUSDAmount,
            address upperHint,
            address lowerHint
        )
    {
        maxFeePercentage = abi.decode(_callData[0], (uint256));
        collAmount = abi.decode(_callData[1], (uint256));
        LUSDAmount = abi.decode(_callData[2], (uint256));
        upperHint = abi.decode(_callData[3], (address));
        lowerHint = abi.decode(_callData[4], (address));
    }
}