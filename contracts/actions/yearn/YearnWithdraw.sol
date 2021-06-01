// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/yearn/yVault.sol";
import "../../interfaces/yearn/YearnRegistry.sol";
import "../../DS/DSMath.sol";

/// @title Supplies tokens to Yearn vault
contract YearnWithdraw is ActionBase, DSMath {
    using TokenUtils for address;

    /// @param token - address of yToken to withdraw (same as yVault address)
    /// @param amount - amount of yToken to withdraw
    /// @param from - address from which to pull tokens from
    /// @param to - address where received underlying tokens will be sent to
    struct Params {
        address token;
        uint256 amount;
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

        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[0], _subData, _returnValues);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);

        uint256 amountReceived = _yearnWithdraw(inputData);
        return (bytes32(amountReceived));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _yearnDirectWithdraw(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
    
    /// @dev this function sends only the amount of tokens received from withdrawing to an account
    /// @return tokenAmountReceived amount of tokens we received from withdrawing
    function _yearnWithdraw(Params memory _inputData) internal returns (uint256 tokenAmountReceived){
            YVault vault = YVault(_inputData.token);

            uint amountPulled = _inputData.token.pullTokensIfNeeded(_inputData.from, _inputData.amount);
            _inputData.token.approveToken(address(vault), amountPulled);
            _inputData.amount = amountPulled;

            address underlyingToken = vault.token();

            uint256 underlyingTokenBalanceBefore = underlyingToken.getBalance(address(this));
            vault.withdraw(_inputData.amount);
            uint256 underlyingTokenBalanceAfter = underlyingToken.getBalance(address(this));
            tokenAmountReceived = sub(underlyingTokenBalanceAfter, underlyingTokenBalanceBefore);

            if (address(this) != _inputData.to){
                underlyingToken.withdrawTokens(_inputData.to, tokenAmountReceived);
            }

            logger.Log(
                    address(this),
                    msg.sender,
                    "YearnWithdraw",
                    abi.encode(_inputData, tokenAmountReceived)
                );
        }

    /// @dev this function sends whole proxy token balance to an address
    function _yearnDirectWithdraw(Params memory _inputData) internal {
        uint amountPulled = _inputData.token.pullTokensIfNeeded(_inputData.from, _inputData.amount);

        YVault vault = YVault(_inputData.token);
        address underlyingToken = vault.token();

        _inputData.token.approveToken(address(vault), amountPulled);
        _inputData.amount = amountPulled;

        vault.withdraw(_inputData.amount);
        
        uint256 tokenAmount = underlyingToken.getBalance(address(this));

        if (address(this) != _inputData.to){
            underlyingToken.withdrawTokens(_inputData.to, tokenAmount);
        }

        logger.Log(
                address(this),
                msg.sender,
                "YearnWithdraw",
                abi.encode(_inputData, tokenAmount)
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