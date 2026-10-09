// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDepositAdapter } from "../../interfaces/protocols/etherFi/IDepositAdapter.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { EtherFiHelper } from "./helpers/EtherFiHelper.sol";

/// @title Deposits wstETH into EtherFi through its Lido route and receives weETH
contract EtherFiStakeFromLido is ActionBase, EtherFiHelper {
    using TokenUtils for address;

    /// @param amount Amount of wstETH to pull
    /// @param minAmountOut Minimum amount of weETH to receive
    /// @param from Address from which to pull wstETH
    /// @param to Address where received weETH will be sent
    struct Params {
        uint256 amount;
        uint256 minAmountOut;
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount =
            _parseParamUint(inputData.amount, _paramMapping[0], _subData, _returnValues);
        inputData.minAmountOut =
            _parseParamUint(inputData.minAmountOut, _paramMapping[1], _subData, _returnValues);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[2], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[3], _subData, _returnValues);

        (uint256 receivedAmount, bytes memory logData) = _etherFiStakeFromLido(inputData);
        emit ActionEvent("EtherFiStakeFromLido", logData);
        return bytes32(receivedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _etherFiStakeFromLido(inputData);
        logger.logActionDirectEvent("EtherFiStakeFromLido", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _etherFiStakeFromLido(Params memory _inputData)
        internal
        returns (uint256 weEthReceivedAmount, bytes memory logData)
    {
        _inputData.amount = WSTETH_ADDR.pullTokensIfNeeded(_inputData.from, _inputData.amount);
        WSTETH_ADDR.approveToken(ETHER_FI_DEPOSIT_ADAPTER, _inputData.amount);

        IDepositAdapter.PermitInput memory emptyPermit;
        emptyPermit.deadline = type(uint256).max;

        weEthReceivedAmount = IDepositAdapter(ETHER_FI_DEPOSIT_ADAPTER)
            .depositWstETHForWeETHWithPermit(
                _inputData.amount, _inputData.minAmountOut, address(0), emptyPermit
            );

        WEETH_ADDR.withdrawTokens(_inputData.to, weEthReceivedAmount);
        logData = abi.encode(_inputData, weEthReceivedAmount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
