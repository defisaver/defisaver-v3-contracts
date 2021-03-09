// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/compound/IComptroller.sol";
import "../../interfaces/compound/ICToken.sol";
import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompHelper.sol";

/// @title Borrow a token from Compound
contract CompBorrow is ActionBase, CompHelper {

    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address cTokenAddr, uint256 amount, address to) = parseInputs(_callData);

        cTokenAddr = _parseParamAddr(cTokenAddr, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        uint256 withdrawAmount = _borrow(cTokenAddr, amount, to);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable   {
        (address tokenAddr, uint256 amount, address to) = parseInputs(_callData);

        _borrow(tokenAddr, amount, to);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _borrow(address _cTokenAddr, uint _amount, address _to) internal returns (uint) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        enterMarket(_cTokenAddr);

        require(ICToken(_cTokenAddr).borrow(_amount) == 0, "Comp borrow failed");

        tokenAddr.withdrawTokens(_to, _amount);

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address cTokenAddr,
            uint256 amount,
            address to
        )
    {
        cTokenAddr = abi.decode(_callData[0], (address));
        amount = abi.decode(_callData[1], (uint256));
        to = abi.decode(_callData[2], (address));
    }
}