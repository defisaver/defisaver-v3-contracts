// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquityBorrow is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 maxFeePercentage, uint256 lusdAmount, address to, address upperHint, address lowerHint) = parseInputs(_callData);

        maxFeePercentage = _parseParamUint(maxFeePercentage, _paramMapping[0], _subData, _returnValues);
        lusdAmount = _parseParamUint(lusdAmount, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        lusdAmount = _liquityBorrow(maxFeePercentage, lusdAmount, to, upperHint, lowerHint);
        return bytes32(lusdAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (uint256 maxFeePercentage, uint256 lusdAmount, address to, address upperHint, address lowerHint) = parseInputs(_callData);

        _liquityBorrow(maxFeePercentage, lusdAmount, to, upperHint, lowerHint);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Increases the trove's debt and withdraws minted LUSD tokens from the trove
    /// @param _maxFeePercentage Highest borrowing fee to accept, ranges between 0.5 and 5%
    /// @param _lusdAmount Amount of LUSD tokens to borrow
    /// @param _to Address that will receive the tokens
    function _liquityBorrow(uint256 _maxFeePercentage, uint256 _lusdAmount, address _to, address _upperHint, address _lowerHint) internal returns (uint256) {
        BorrowerOperations.withdrawLUSD(_maxFeePercentage, _lusdAmount, _upperHint, _lowerHint);

        LUSDTokenAddr.withdrawTokens(_to, _lusdAmount);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityBorrow",
            abi.encode(_maxFeePercentage, _lusdAmount, _to)
        );

        return _lusdAmount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (uint256 maxFeePercentage, uint256 lusdAmount, address to, address upperHint, address lowerHint)
    {
        maxFeePercentage = abi.decode(_callData[0], (uint256));
        lusdAmount = abi.decode(_callData[1], (uint256));
        to = abi.decode(_callData[2], (address));
        upperHint = abi.decode(_callData[3], (address));
        lowerHint = abi.decode(_callData[4], (address));
    }
}