// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/yearn/IYVault.sol";
import "../../DS/DSMath.sol";

/// @title Supplies tokens to Yearn vault
contract YearnWithdraw is ActionBase, DSMath {
    using TokenUtils for address;

    /// @param yToken - address of yToken to withdraw (same as yVault address)
    /// @param yAmount - amount of yToken to withdraw
    /// @param from - address from which to pull tokens from
    /// @param to - address where received underlying tokens will be sent to
    struct Params {
        address yToken;
        uint256 yAmount;
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.yAmount = _parseParamUint(inputData.yAmount, _paramMapping[0], _subData, _returnValues);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);

        uint256 amountReceived = _yearnWithdraw(inputData);
        return (bytes32(amountReceived));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _yearnWithdraw(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
    
    function _yearnWithdraw(Params memory _inputData) internal returns (uint256 tokenAmountReceived){
            IYVault vault = IYVault(_inputData.yToken);

            uint amountPulled = _inputData.yToken.pullTokensIfNeeded(_inputData.from, _inputData.yAmount);
            _inputData.yToken.approveToken(address(vault), amountPulled);
            _inputData.yAmount = amountPulled;

            address underlyingToken = vault.token();

            uint256 underlyingTokenBalanceBefore = underlyingToken.getBalance(address(this));
            vault.withdraw(_inputData.yAmount);
            uint256 underlyingTokenBalanceAfter = underlyingToken.getBalance(address(this));
            tokenAmountReceived = sub(underlyingTokenBalanceAfter, underlyingTokenBalanceBefore);
            
            underlyingToken.withdrawTokens(_inputData.to, tokenAmountReceived);
            
            logger.Log(
                    address(this),
                    msg.sender,
                    "YearnWithdraw",
                    abi.encode(_inputData, tokenAmountReceived)
                );
    }

    function parseInputs(bytes[] memory _callData)
            internal
            pure
            returns (
                Params memory inputData
            )
        {
            inputData = abi.decode(_callData[0], (Params));
        }
}