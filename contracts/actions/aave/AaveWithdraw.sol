// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveHelper } from "./helpers/AaveHelper.sol";
import { FLFeeFaucet } from "../../utils/FLFeeFaucet.sol";
import { ILendingPoolV2 } from "../../interfaces/aaveV2/ILendingPoolV2.sol";

/// @title Withdraw a token from an Aave market
contract AaveWithdraw is ActionBase, AaveHelper {
    using TokenUtils for address;

    /// @param market Aave Market address.
    /// @param tokenAddr Token address.
    /// @param amount Amount of tokens to withdraw.
    /// @param to Address to send the withdrawn tokens to.
    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.tokenAddr = _parseParamAddr(params.tokenAddr, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[3], _subData, _returnValues);

        (uint256 withdrawnAmount, bytes memory logData) = _withdraw(params.market, params.tokenAddr, params.amount, params.to);
        emit ActionEvent("AaveWithdraw", logData);
        return bytes32(withdrawnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params.market, params.tokenAddr, params.amount, params.to);
        logger.logActionDirectEvent("AaveWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User withdraws tokens from the Aave protocol
    /// @param _market Address provider for specific market
    /// @param _tokenAddr The address of the token to be withdrawn
    /// @param _amount Amount of tokens to be withdrawn -> send type(uint).max for whole amount
    /// @param _to Where the withdrawn tokens will be sent
    function _withdraw(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        address _to
    ) internal returns (uint256, bytes memory) {
        ILendingPoolV2 lendingPool = getLendingPool(_market);
        uint256 tokenBefore;
        uint256 amountToWithdraw = _amount;

        // only need to remember this is _amount is max, no need to waste gas otherwise
        if (_amount == type(uint256).max) {
            tokenBefore = _tokenAddr.getBalance(_to);
        } else {
            /// @dev sometimes aave eats one wei when supplying, this breaks our recipes
            /// @dev here we do the check and send the difference to the receiving address
            address aToken = lendingPool.getReserveData(_tokenAddr).aTokenAddress;
            uint256 aTokenBalance = aToken.getBalance(address(this));

            if (aTokenBalance < _amount) {
                uint256 difference = _amount - aTokenBalance;

                if (difference < 3) {
                    FLFeeFaucet(DYDX_FL_FEE_FAUCET).my2Wei(_tokenAddr);
                    _tokenAddr.withdrawTokens(_to, difference);
                    _tokenAddr.withdrawTokens(DYDX_FL_FEE_FAUCET, 2 - difference);
                    amountToWithdraw = aTokenBalance;
                }
            }
        }

        // withdraw underlying tokens from aave and send _to address
        lendingPool.withdraw(_tokenAddr, amountToWithdraw, _to);

        // if the input amount is max calc. what was the exact _amount
        if (_amount == type(uint256).max) {
            _amount = _tokenAddr.getBalance(_to) - tokenBefore;
        }

        bytes memory logData = abi.encode(_market, _tokenAddr, _amount, _to);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
