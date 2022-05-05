// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/lido/IWStEth.sol";
import "./helpers/LidoHelper.sol";

/// @title Unwrap WStEth and receive StEth
contract LidoUnwrap is ActionBase, DSMath, LidoHelper {
    using TokenUtils for address;

    /// @param amount - amount of WStEth to pull
    /// @param from - address from which to pull WStEth from
    /// @param to - address where received stETH will be sent to
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

        inputData.amount = _parseParamUint(
            inputData.amount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);
        
        (uint256 stEthReceivedAmount, bytes memory logData) = _lidoUnwrap(inputData);
        emit ActionEvent("LidoUnwrap", logData);
        return bytes32(stEthReceivedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _lidoUnwrap(inputData);
        logger.logActionDirectEvent("LidoUnwrap", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _lidoUnwrap(Params memory _inputData) internal returns (uint256 stEthReceivedAmount, bytes memory logData) {
        require(_inputData.to != address(0), "Can't send to burn address");
        require(_inputData.amount > 0, "Amount to unwrap can't be 0");

        _inputData.amount =
            lidoWrappedStEth.pullTokensIfNeeded(_inputData.from, _inputData.amount);

        stEthReceivedAmount = IWStEth(lidoWrappedStEth).unwrap(_inputData.amount);
        
        lidoStEth.withdrawTokens(_inputData.to, stEthReceivedAmount);

        logData = abi.encode(_inputData, stEthReceivedAmount);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
