// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquityPayback is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint lusdAmount, address from, address upperHint, address lowerHint) = parseInputs(_callData);

        lusdAmount = _parseParamUint(lusdAmount, _paramMapping[0], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[1], _subData, _returnValues);

        lusdAmount = _liquityPayback(lusdAmount, from, upperHint, lowerHint);
        return bytes32(lusdAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (uint lusdAmount, address from, address upperHint, address lowerHint) = parseInputs(_callData);

        _liquityPayback(lusdAmount, from, upperHint, lowerHint);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Repay LUSD tokens to a Trove: Burn the repaid LUSD tokens, and reduce the trove's debt accordingly
    function _liquityPayback(uint _lusdAmount, address _from, address _upperHint, address _lowerHint) internal returns (uint256) {
        LUSDTokenAddr.pullTokensIfNeeded(_from, _lusdAmount);
        
        BorrowerOperations.repayLUSD(_lusdAmount, _upperHint, _lowerHint);
        
        logger.Log(
            address(this),
            msg.sender,
            "LiquityPayback",
            abi.encode(_lusdAmount, _from)
        );

        return _lusdAmount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (uint lusdAmount, address from, address upperHint, address lowerHint)
    {
        lusdAmount = abi.decode(_callData[0], (uint256));
        from = abi.decode(_callData[1], (address));
        upperHint = abi.decode(_callData[2], (address));
        lowerHint = abi.decode(_callData[3], (address));
    }
}