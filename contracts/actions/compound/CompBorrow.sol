// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ICToken } from "../../interfaces/compound/ICToken.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { CompHelper } from "./helpers/CompHelper.sol";

/// @title Borrow a token from Compound
contract CompBorrow is ActionBase, CompHelper {
    using TokenUtils for address;

    /// @param cTokenAddr Address of the cToken token to borrow
    /// @param amount Amount of tokens to be borrowed
    /// @param to The address that will receive the borrowed tokens
    struct Params {
        address cTokenAddr;
        uint256 amount;
        address to;
    }
    error CompBorrowError();

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
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        (uint256 withdrawAmount, bytes memory logData) = _borrow(params.cTokenAddr, params.amount, params.to);
        emit ActionEvent("CompBorrow", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _borrow(params.cTokenAddr, params.amount, params.to);
        logger.logActionDirectEvent("CompBorrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User borrows tokens from the Compound protocol
    /// @param _cTokenAddr Address of the cToken we are borrowing
    /// @param _amount Amount of tokens to be borrowed
    /// @param _to The address we are sending the borrowed tokens to
    function _borrow(
        address _cTokenAddr,
        uint256 _amount,
        address _to
    ) internal returns (uint256, bytes memory) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);
        // if the tokens are borrowed we need to enter the market
        enterMarket(_cTokenAddr);

        if (ICToken(_cTokenAddr).borrow(_amount) != NO_ERROR){
            revert CompBorrowError();
        }

        // always return WETH, never native Eth
        if (tokenAddr == TokenUtils.WETH_ADDR) {
            TokenUtils.depositWeth(_amount);
        }
        tokenAddr.withdrawTokens(_to, _amount);

        bytes memory logData = abi.encode(tokenAddr, _amount, _to);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
