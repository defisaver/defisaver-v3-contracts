// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompHelper.sol";

/// @title Supply a token to Compound
contract CompSupply is ActionBase, CompHelper {

    using TokenUtils for address;

    string public constant ERR_COMP_SUPPLY_FAILED = "Compound supply failed";

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address cTokenAddr, uint256 amount, address from, bool enableAsColl) = parseInputs(_callData);

        cTokenAddr = _parseParamAddr(cTokenAddr, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);  
        from = _parseParamAddr(from, _paramMapping[2], _subData, _returnValues);

        uint256 withdrawAmount = _supply(cTokenAddr, amount, from, enableAsColl);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable   {
        (address tokenAddr, uint256 amount, address from, bool enableAsColl) = parseInputs(_callData);

        _supply(tokenAddr, amount, from, enableAsColl);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Supplies a token to the Compound protocol
    /// @dev If amount == uint(-1) we are getting the whole balance of the proxy
    /// @param _cTokenAddr Address of the cToken we'll get when supplying
    /// @param _amount Amount of the underlying token we are supplying
    /// @param _from Address where we are pulling the underlying tokens from
    /// @param _enableAsColl If the supply asset should be collateral
    function _supply(address _cTokenAddr, uint _amount, address _from, bool _enableAsColl) internal returns (uint) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        // if amount -1, pull current proxy balance
        if (_amount == type(uint).max) {
            _amount = tokenAddr.getBalance(address(this));
        }

        tokenAddr.pullTokens(_from, _amount);

        if (_enableAsColl) {
            enterMarket(_cTokenAddr);
        }

        if (tokenAddr != TokenUtils.WETH_ADDR) {
            tokenAddr.approveToken(_cTokenAddr, _amount);

            require(ICToken(_cTokenAddr).mint(_amount) == 0, ERR_COMP_SUPPLY_FAILED);
        } else {
            TokenUtils.withdrawWeth(_amount);
            ICToken(_cTokenAddr).mint{value: _amount}(); // reverts on fail
        }

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address cTokenAddr,
            uint256 amount,
            address from,
            bool enableAsColl
        )
    {
        cTokenAddr = abi.decode(_callData[0], (address));
        amount = abi.decode(_callData[1], (uint256));
        from = abi.decode(_callData[2], (address));
        enableAsColl = abi.decode(_callData[3], (bool));
    }
}