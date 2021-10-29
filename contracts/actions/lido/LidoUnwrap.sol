// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/lido/IWStEth.sol";

/// @title Unwrap WStEth and receive StEth
contract LidoUnwrap is ActionBase, DSMath {
    using TokenUtils for address;

    address public constant lidoWrappedStEth = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;
    address public constant lidoStEth = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;

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
        bytes[] memory _callData,
        bytes[] memory _subData,
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
        
        uint256 stEthReceivedAmount = _lidoUnwrap(inputData);
        return bytes32(stEthReceivedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _lidoUnwrap(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _lidoUnwrap(Params memory _inputData) internal returns (uint256 stEthReceivedAmount) {
        require(_inputData.to != address(0), "Can't send to burn address");
        require(_inputData.amount > 0, "Amount to unwrap can't be 0");

        _inputData.amount =
            lidoWrappedStEth.pullTokensIfNeeded(_inputData.from, _inputData.amount);

        stEthReceivedAmount = IWStEth(lidoWrappedStEth).unwrap(_inputData.amount);
        
        lidoStEth.withdrawTokens(_inputData.to, stEthReceivedAmount);

        logger.Log(address(this), msg.sender, "LidoUnwrap", abi.encode(_inputData, stEthReceivedAmount));
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
