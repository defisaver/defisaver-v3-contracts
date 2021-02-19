// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/IWETH.sol";
import "../../interfaces/compound/ICToken.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompHelper.sol";

/// @title Withdraw a token from Compound
contract CompWithdraw is ActionBase, CompHelper, GasBurner {

    using TokenUtils for address;

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
    /// @dev Send type(uint).max to withdraw whole balance
    /// @param _cTokenAddr cToken address
    /// @param _amount Amount of underlyinh tokens to withdraw
    /// @param _to Address where to send the tokens to (can be left on proxy)
    function _withdraw(address _cTokenAddr, uint _amount, address _to) internal returns (uint) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        uint tokenBalanceBefore = tokenAddr.getBalance(address(this));

        // if _amount type(uint).max that means take out whole balance
        if (_amount == type(uint).max) {
            _amount = _cTokenAddr.getBalance(address(this));
            require(ICToken(_cTokenAddr).redeem(_amount) == 0, "Comp redeem failed");
        } else {
            require(ICToken(_cTokenAddr).redeemUnderlying(_amount) == 0, "Comp redeem failed");
        }

        uint tokenBalanceAfter = tokenAddr.getBalance(address(this));

        // used to return the precise amount of tokens returned
        _amount = tokenBalanceAfter - tokenBalanceBefore;

        tokenAddr.withdrawTokens(_to, _amount);

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