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
        (uint256 maxFeePercentage, uint256 LUSDAmount, address to, address upperHint, address lowerHint) = parseInputs(_callData);

        maxFeePercentage = _parseParamUint(maxFeePercentage, _paramMapping[0], _subData, _returnValues);
        LUSDAmount = _parseParamUint(LUSDAmount, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        LUSDAmount = _liquityBorrow(maxFeePercentage, LUSDAmount, to, upperHint, lowerHint);
        return bytes32(LUSDAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (uint256 maxFeePercentage, uint256 LUSDAmount, address to, address upperHint, address lowerHint) = parseInputs(_callData);

        _liquityBorrow(maxFeePercentage, LUSDAmount, to, upperHint, lowerHint);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraw LUSD tokens from a trove: mint new LUSD tokens to the owner, and increase the trove's debt accordingly
    function _liquityBorrow(uint256 _maxFeePercentage, uint256 _LUSDAmount, address _to, address _upperHint, address _lowerHint) internal returns (uint256) {
        BorrowerOperations.withdrawLUSD(_maxFeePercentage, _LUSDAmount, _upperHint, _lowerHint);

        LUSDTokenAddr.withdrawTokens(_to, _LUSDAmount);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityBorrow",
            abi.encode(_maxFeePercentage, _LUSDAmount, _to)
        );

        return _LUSDAmount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (uint256 maxFeePercentage, uint256 LUSDAmount, address to, address upperHint, address lowerHint)
    {
        maxFeePercentage = abi.decode(_callData[0], (uint256));
        LUSDAmount = abi.decode(_callData[1], (uint256));
        to = abi.decode(_callData[2], (address));
        upperHint = abi.decode(_callData[3], (address));
        lowerHint = abi.decode(_callData[4], (address));
    }
}