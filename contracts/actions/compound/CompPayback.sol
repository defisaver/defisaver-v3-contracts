// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ICToken } from "../../interfaces/compound/ICToken.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { CompHelper } from "./helpers/CompHelper.sol";

/// @title Payback a token a user borrowed from Compound.
contract CompPayback is ActionBase, CompHelper {
    using TokenUtils for address;

    /// @param cTokenAddr Address of the cToken token to payback
    /// @param amount Amount of tokens to be paid back
    /// @param from Address where we are pulling the underlying tokens from
    /// @param onBehalf Repay on behalf of which address (if 0x0 defaults to user's wallet)
    struct Params {
        address cTokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
    }
    error CompPaybackError();

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.cTokenAddr = _parseParamAddr(params.cTokenAddr, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[3], _subData, _returnValues);

        (uint256 withdrawAmount, bytes memory logData) = _payback(params.cTokenAddr, params.amount, params.from, params.onBehalf);
        emit ActionEvent("CompPayback", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(params.cTokenAddr, params.amount, params.from, params.onBehalf);
        logger.logActionDirectEvent("CompPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Payback a borrowed token from the Compound protocol.
    /// @dev Amount type(uint).max will take the whole borrow amount
    /// @param _cTokenAddr Address of the cToken we are paying back
    /// @param _amount Amount of the underlying token
    /// @param _from Address where we are pulling the underlying tokens from
    /// @param _onBehalf Repay on behalf of which address (if 0x0 defaults to user's wallet)
    function _payback(
        address _cTokenAddr,
        uint256 _amount,
        address _from,
        address _onBehalf
    ) internal returns (uint256, bytes memory) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        // default to onBehalf of user's wallet
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }
        
        uint256 maxDebt = ICToken(_cTokenAddr).borrowBalanceCurrent(_onBehalf);
        _amount = _amount > maxDebt ? maxDebt : _amount;

        tokenAddr.pullTokensIfNeeded(_from, _amount);

        // we always expect actions to deal with WETH never Eth
        if (tokenAddr != TokenUtils.WETH_ADDR) {
            tokenAddr.approveToken(_cTokenAddr, _amount);
            if (ICToken(_cTokenAddr).repayBorrowBehalf(_onBehalf, _amount) != NO_ERROR){
                revert CompPaybackError();
            }
        } else {
            TokenUtils.withdrawWeth(_amount);
            ICToken(_cTokenAddr).repayBorrowBehalf{value: _amount}(_onBehalf); // reverts on fail
        }

        bytes memory logData = abi.encode(tokenAddr, _amount, _from, _onBehalf);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
