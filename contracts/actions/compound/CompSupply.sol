// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/IWETH.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompHelper.sol";

/// @title Supply a token to Compound
contract CompSupply is ActionBase, CompHelper, GasBurner {

    using TokenUtils for address;

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
        from = _parseParamAddr(from, _paramMapping[2], _subData, _returnValues);

        uint256 withdrawAmount = _supply(cTokenAddr, amount, from);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        _supply(tokenAddr, amount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////


    function _supply(address _cTokenAddr, uint _amount, address _from) internal returns (uint) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        // if amount -1, pull current proxy balance
        if (_amount == type(uint).max) {
            _amount = tokenAddr.getBalance(address(this));
        }

        tokenAddr.pullTokens(_from, _amount);
        tokenAddr.approveToken(_cTokenAddr, type(uint).max);

        if (isAlreadyInMarket(_cTokenAddr)) {
            enterMarket(_cTokenAddr);
        }

        if (tokenAddr != TokenUtils.ETH_ADDR) {
            require(ICToken(_cTokenAddr).mint(_amount) == 0, "Comp supply failed");
        } else {
            ICToken(_cTokenAddr).mint{value: msg.value}(); // reverts on fail
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