// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../interfaces/compound/IComptroller.sol";
import "../../interfaces/compound/ICToken.sol";
import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompHelper.sol";

/// @title Payback a token a user borrowed from Compound
contract CompPayback is ActionBase, CompHelper {
    using TokenUtils for address;

    string public constant ERR_COMP_PAYBACK_FAILED = "Compound payback failed";

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (
            address cTokenAddr,
            uint256 amount,
            address from,
            address onBehalf
        ) = parseInputs(_callData);

        cTokenAddr = _parseParamAddr(cTokenAddr, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[2], _subData, _returnValues);
        uint256 withdrawAmount = _payback(cTokenAddr, amount, from, onBehalf);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (
            address cTokenAddr,
            uint256 amount, 
            address from,
            address onBehalf
        ) = parseInputs(_callData);

        _payback(cTokenAddr, amount, from, onBehalf);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Payback a borrowed token from the Compound protocol
    /// @dev Amount type(uint).max will take the whole borrow amount
    /// @param _cTokenAddr Address of the cToken we are paying back
    /// @param _amount Amount of the underlying token
    /// @param _from Address where we are pulling the underlying tokens from
    function _payback(
        address _cTokenAddr,
        uint256 _amount,
        address _from,
        address _onBehalf
    ) internal returns (uint256) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        // default to onBehalf of proxy
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }

        uint256 maxDebt = ICToken(_cTokenAddr).borrowBalanceCurrent(_onBehalf);
        _amount = _amount > maxDebt ? maxDebt : _amount;

        tokenAddr.pullTokensIfNeeded(_from, _amount);

        // we always expect actions to deal with WETH never Eth
        if (tokenAddr != TokenUtils.WETH_ADDR) {
            tokenAddr.approveToken(_cTokenAddr, _amount);
            require(ICToken(_cTokenAddr).repayBorrowBehalf(_onBehalf ,_amount) == NO_ERROR, ERR_COMP_PAYBACK_FAILED);
        } else {
            TokenUtils.withdrawWeth(_amount);
            ICToken(_cTokenAddr).repayBorrowBehalf{value: _amount}(_onBehalf); // reverts on fail
        }

        logger.Log(address(this), msg.sender, "CompPayback", abi.encode(tokenAddr, _amount, _from, _onBehalf));

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address cTokenAddr,
            uint256 amount,
            address from,
            address onBehalf
        )
    {
        cTokenAddr = abi.decode(_callData[0], (address));
        amount = abi.decode(_callData[1], (uint256));
        from = abi.decode(_callData[2], (address));
        onBehalf = abi.decode(_callData[3], (address));
    }
}
