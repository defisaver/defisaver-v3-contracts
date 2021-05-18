// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../interfaces/liquity/IBorrowerOperations.sol";
import "../ActionBase.sol";

contract LiquityWithdraw is ActionBase {

    address constant BorrowerOperationsAddr = 0x24179CD81c9e782A4096035f7eC97fB8B783e007;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 collAmount, address upperHint, address lowerHint) = parseInputs(_callData);

        collAmount = _parseParamUint(collAmount, _paramMapping[0], _subData, _returnValues);

        collAmount = _liquityWithdraw(collAmount, upperHint, lowerHint);
        return bytes32(collAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (uint256 collAmount, address upperHint, address lowerHint) = parseInputs(_callData);

        _liquityWithdraw(collAmount, upperHint, lowerHint);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraw ETH collateral from a trove
    function _liquityWithdraw(uint256 _collAmount, address _upperHint, address _lowerHint) internal returns (uint256) {
        IBorrowerOperations(BorrowerOperationsAddr).withdrawColl(_collAmount, _upperHint, _lowerHint);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityWithdraw",
            abi.encode(_collAmount)
        );

        return _collAmount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (uint256 collAmount, address upperHint, address lowerHint)
    {
        collAmount = abi.decode(_callData[0], (uint256));
        upperHint = abi.decode(_callData[1], (address));
        lowerHint = abi.decode(_callData[2], (address));
    }
}