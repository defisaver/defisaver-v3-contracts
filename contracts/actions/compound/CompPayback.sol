// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/compound/IComptroller.sol";
import "../../interfaces/compound/ICToken.sol";
import "../../interfaces/IWETH.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompHelper.sol";

/// @title Payback a token a user borrowed from Compound
contract CompPayback is ActionBase, CompHelper, TokenUtils, GasBurner {

    string public constant ERR_COMP_PAYBACK_FAILED = "Compound payback failed";

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address cTokenAddr, uint256 amount, address from) = parseInputs(_callData);

        cTokenAddr = _parseParamAddr(cTokenAddr, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);

        uint256 withdrawAmount = _payback(cTokenAddr, amount, from);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        _payback(tokenAddr, amount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Payback a borrowed token from the Compound protcol
    /// @dev Amount uint(-1) will take the whole borrow amount
    /// @param _cTokenAddr Address of the cToken we are paybacking
    /// @param _amount Amount of the underlying token
    /// @param _from Address where we are pulling the underlying tokens from
    function _payback(address _cTokenAddr, uint _amount, address _from) internal returns (uint) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        // if uint(-1) payback whole proxy borrow amount
        if (_amount == uint(-1)) {
            _amount = ICToken(_cTokenAddr).borrowBalanceCurrent(address(this));
        }

        if (tokenAddr != ETH_ADDR) {
            pullTokens(tokenAddr, _from, _amount);
            approveToken(tokenAddr, _cTokenAddr, _amount);

            require(ICToken(_cTokenAddr).repayBorrow(_amount) == 0, ERR_COMP_PAYBACK_FAILED);
        } else {
            ICToken(_cTokenAddr).repayBorrow{value: _amount}();
        }

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address cTokenAddr,
            uint256 amount,
            address from
        )
    {
        cTokenAddr = abi.decode(_callData[0], (address));
        amount = abi.decode(_callData[1], (uint256));
        from = abi.decode(_callData[2], (address));

    }
}