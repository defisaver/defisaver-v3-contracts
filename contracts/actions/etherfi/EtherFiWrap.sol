// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IWeEth } from "../../interfaces/etherFi/IWeEth.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { EtherFiHelper } from "./helpers/EtherFiHelper.sol";

/// @title Wraps eETH into Wrapped eETH (weETH)
contract EtherFiWrap is ActionBase, EtherFiHelper {
    using TokenUtils for address;

    /// @param amount - amount of eETH to pull
    /// @param from - address from which to pull eETH from
    /// @param to - address where received weETH will be sent to
    struct Params {
        uint256 amount;
        address from;
        address to;
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

        (uint256 weEthReceivedAmount, bytes memory logData) = _etherFiWrap(inputData);
        emit ActionEvent("EtherFiWrap", logData);
        return bytes32(weEthReceivedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _etherFiWrap(inputData);
        logger.logActionDirectEvent("EtherFiWrap", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _etherFiWrap(Params memory _inputData) internal returns (uint256 weEthReceivedAmount, bytes memory logData){
        _inputData.amount = EETH_ADDR.pullTokensIfNeeded(_inputData.from, _inputData.amount);

        EETH_ADDR.approveToken(WEETH_ADDR, _inputData.amount);

        weEthReceivedAmount = IWeEth(WEETH_ADDR).wrap(_inputData.amount);

        WEETH_ADDR.withdrawTokens(_inputData.to, weEthReceivedAmount);

        logData = abi.encode(_inputData, weEthReceivedAmount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
