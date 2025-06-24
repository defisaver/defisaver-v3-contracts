// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ICToken } from "../../interfaces/compound/ICToken.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { CompHelper } from "./helpers/CompHelper.sol";

/// @title Withdraw a token from Compound.
contract CompWithdraw is ActionBase, CompHelper {
    using TokenUtils for address;

    /// @param cTokenAddr Address of the cToken token to withdraw
    /// @param amount Amount of tokens to be withdrawn
    /// @param to Address that will receive the withdrawn tokens
    struct Params {
        address cTokenAddr;
        uint256 amount;
        address to;
    }

    error CompRedeemError();
    error CompUnderlyingRedeemError();

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

        (uint256 withdrawAmount, bytes memory logData) = _withdraw(params.cTokenAddr, params.amount, params.to);
        emit ActionEvent("CompWithdraw", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params.cTokenAddr, params.amount, params.to);
        logger.logActionDirectEvent("CompWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws a underlying token amount from compound
    /// @dev Send type(uint).max to withdraw whole balance
    /// @param _cTokenAddr cToken address
    /// @param _amount Amount of underlying tokens to withdraw
    /// @param _to Address where to send the tokens to (can be left on user's wallet)
    function _withdraw(
        address _cTokenAddr,
        uint256 _amount,
        address _to
    ) internal returns (uint256, bytes memory) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        // because comp returns native eth we need to check the balance of that
        if (tokenAddr == TokenUtils.WETH_ADDR) {
            tokenAddr = TokenUtils.ETH_ADDR;
        }

        uint256 tokenBalanceBefore = tokenAddr.getBalance(address(this));

        // if _amount type(uint).max that means take out user's wallet whole balance
        if (_amount == type(uint256).max) {
            _amount = _cTokenAddr.getBalance(address(this));
            if (ICToken(_cTokenAddr).redeem(_amount) != NO_ERROR){
                revert CompRedeemError();
            }
        } else {
            if (ICToken(_cTokenAddr).redeemUnderlying(_amount) != NO_ERROR){
                revert CompUnderlyingRedeemError();
            }
        }

        uint256 tokenBalanceAfter = tokenAddr.getBalance(address(this));

        // used to return the precise amount of tokens returned
        _amount = tokenBalanceAfter - tokenBalanceBefore;

        // always return WETH, never native Eth
        if (tokenAddr == TokenUtils.ETH_ADDR) {
            TokenUtils.depositWeth(_amount);
            tokenAddr = TokenUtils.WETH_ADDR; // switch back to weth
        }

        // If tokens needs to be send to the _to address
        tokenAddr.withdrawTokens(_to, _amount);

        bytes memory logData = abi.encode(tokenAddr, _amount, _to);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
