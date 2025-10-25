// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { DSMath } from "../../_vendor/DS/DSMath.sol";
import { IWStEth } from "../../interfaces/protocols/lido/IWStEth.sol";
import { LidoHelper } from "./helpers/LidoHelper.sol";

/// @title Wraps either WETH or StEth into WrappedStakedEther (WStEth)
contract LidoWrap is ActionBase, DSMath, LidoHelper {
    using TokenUtils for address;

    /// @param amount - amount to pull
    /// @param from - address from which to pull token from
    /// @param to - address where received WStEth will be sent to
    /// @param useWeth - true for using WETH, false for using stEth
    struct Params {
        uint256 amount;
        address from;
        address to;
        bool useWeth;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[0], _subData, _returnValues);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);

        (uint256 wStEthReceivedAmount, bytes memory logData) = _lidoWrap(inputData);
        emit ActionEvent("LidoWrap", logData);
        return bytes32(wStEthReceivedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _lidoWrap(inputData);
        logger.logActionDirectEvent("LidoWrap", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
    function _lidoWrap(Params memory _inputData) internal returns (uint256 wStEthReceivedAmount, bytes memory logData) {
        require(_inputData.to != address(0), "Can't be sent to burn address");
        require(_inputData.amount > 0, "Amount to wrap can't be 0");
        if (_inputData.useWeth) {
            wStEthReceivedAmount = _lidoStakeAndWrapWETH(_inputData);
        } else {
            wStEthReceivedAmount = _lidoWrapStEth(_inputData);
        }
        lidoWrappedStEth.withdrawTokens(_inputData.to, wStEthReceivedAmount);

        logData = abi.encode(_inputData, wStEthReceivedAmount);
    }

    function _lidoStakeAndWrapWETH(Params memory _inputData) internal returns (uint256 wStEthReceivedAmount) {
        _inputData.amount = TokenUtils.WETH_ADDR.pullTokensIfNeeded(_inputData.from, _inputData.amount);
        TokenUtils.withdrawWeth(_inputData.amount);

        uint256 wStEthBalanceBefore = lidoWrappedStEth.getBalance(address(this));
        (bool sent,) = payable(lidoWrappedStEth).call{ value: _inputData.amount }("");
        require(sent, "Failed to send Ether");
        uint256 wStEthBalanceAfter = lidoWrappedStEth.getBalance(address(this));

        wStEthReceivedAmount = sub(wStEthBalanceAfter, wStEthBalanceBefore);
    }

    function _lidoWrapStEth(Params memory _inputData) internal returns (uint256 wStEthReceivedAmount) {
        _inputData.amount = lidoStEth.pullTokensIfNeeded(_inputData.from, _inputData.amount);
        lidoStEth.approveToken(lidoWrappedStEth, _inputData.amount);

        wStEthReceivedAmount = IWStEth(lidoWrappedStEth).wrap(_inputData.amount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
