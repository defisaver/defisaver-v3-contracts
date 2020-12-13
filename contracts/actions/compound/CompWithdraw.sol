// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/IWETH.sol";
import "../../interfaces/compound/ICToken.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Withdraw a token from Compound
contract CompWithdraw is ActionBase, TokenUtils, GasBurner {

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address tokenAddr, uint256 amount, address to) = parseInputs(_callData);

        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        uint256 withdrawAmount = _withdraw(tokenAddr, amount, to);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        _withdraw(tokenAddr, amount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws a underlying token amount from compound
    /// @dev Send uint(-1) to withdraw whole balance
    /// @param _tokenAddr Address of the token
    /// @param _amount Amount of tokens to withdraw
    /// @param _to Where to send the tokens to (can be left on proxy)
    function _withdraw(address _tokenAddr, uint _amount, address _to) internal returns (uint) {
        address cTokenAddr = ICToken(_tokenAddr).underlying();

        uint tokenBalanceBefore = getBalance(_tokenAddr, address(this));

        // if _amount uint(-1) that means take out whole balance
        if (_amount == uint(-1)) {
            _amount = getBalance(cTokenAddr, address(this));
            require(ICToken(cTokenAddr).redeem(_amount) == 0, "");
        } else {
            require(ICToken(cTokenAddr).redeemUnderlying(_amount) == 0, "");
        }

        uint tokenBalanceAfter = getBalance(_tokenAddr, address(this));

        // used to return the precise amount of tokens returned
        _amount = tokenBalanceAfter - tokenBalanceBefore;

        withdrawTokens(_tokenAddr, _to, _amount);

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address tokenAddr,
            uint256 amount,
            address to
        )
    {
        tokenAddr = abi.decode(_callData[0], (address));
        amount = abi.decode(_callData[1], (uint256));
        to = abi.decode(_callData[2], (address));
    }
}