// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DFSExchangeCore } from "../../exchangeV3/DFSExchangeCore.sol";
import { SellActionHelper } from "./helpers/SellActionHelper.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title A exchange sell action through the dfs exchange that does not take any fee
/// @dev Action has wrap/unwrap WETH builtin so we don't have to bundle into a recipe
contract DFSSellNoFee is ActionBase, DFSExchangeCore {
    using SellActionHelper for ExchangeData;

    /// @notice Parameters for the DFSSellNoFee action
    /// @param exchangeData Exchange data
    /// @param from Address from which we'll pull the srcTokens
    /// @param to Address where we'll send the _to token
    struct Params {
        ExchangeData exchangeData;
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
        Params memory params = parseInputs(_callData);

        params.exchangeData.srcAddr =
            _parseParamAddr(params.exchangeData.srcAddr, _paramMapping[0], _subData, _returnValues);
        params.exchangeData.destAddr = _parseParamAddr(
            params.exchangeData.destAddr, _paramMapping[1], _subData, _returnValues
        );
        params.exchangeData.srcAmount = _parseParamUint(
            params.exchangeData.srcAmount, _paramMapping[2], _subData, _returnValues
        );
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[4], _subData, _returnValues);

        (uint256 exchangedAmount, bytes memory logData) =
            _dfsSellNoFee(params.exchangeData, params.from, params.to);

        emit ActionEvent("DFSSellNoFee", logData);
        return bytes32(exchangedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _dfsSellNoFee(params.exchangeData, params.from, params.to);
        logger.logActionDirectEvent("DFSSellNoFee", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Sells a specified srcAmount for the dest token
    /// @param _exchangeData DFS Exchange data struct
    /// @param _from Address from which we'll pull the srcTokens
    /// @param _to Address where we'll send the _to token
    function _dfsSellNoFee(ExchangeData memory _exchangeData, address _from, address _to)
        internal
        returns (uint256, bytes memory)
    {
        _exchangeData.setMaxAmountIfNeeded(_from);

        (bool handled, uint256 exchangedAmount, bytes memory logData) =
            _exchangeData.tryHandleDirectTokenConversion(_from, _to);
        if (handled) {
            return (exchangedAmount, logData);
        }

        bool isEthDest = _exchangeData.pullTokens(_from);

        // Don't take any fee.
        _exchangeData.dfsFeeDivider = 0;

        // Execute the sell.
        address wrapper;
        (wrapper, exchangedAmount) = _sell(_exchangeData);

        _exchangeData.sendTokensAfterSell(_to, exchangedAmount, isEthDest);
        logData = _exchangeData.encodeSellLogData(wrapper, exchangedAmount);

        return (exchangedAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
