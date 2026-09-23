// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITokenGroupRegistry } from "../../interfaces/exchange/ITokenGroupRegistry.sol";
import { DFSExchangeWithTxSaver } from "../../exchangeV3/DFSExchangeWithTxSaver.sol";
import { SellActionHelper } from "./helpers/SellActionHelper.sol";
import { ActionBase } from "../ActionBase.sol";
import { DFSFeeLib } from "../../utils/fee/DFSFeeLib.sol";

/// @title A exchange sell action through the dfs exchange
/// @dev Action which has wrap/unwrap WETH builtin so we don't have to bundle into a recipe
contract DFSSell is ActionBase, DFSExchangeWithTxSaver {
    using SellActionHelper for ExchangeData;

    /// @notice Parameters for the DFSSell action
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

        // No fee is taken if recipe contains only one action, and that action is sell action.
        bool isDirect = _returnValues.length == 1 ? true : false;

        (uint256 exchangedAmount, bytes memory logData) =
            _dfsSell(params.exchangeData, params.from, params.to, isDirect);

        emit ActionEvent("DFSSell", logData);
        return bytes32(exchangedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _dfsSell(params.exchangeData, params.from, params.to, true);
        logger.logActionDirectEvent("DFSSell", logData);
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
    /// @param _isDirect True if it's just one sell action, false if part of recipe
    function _dfsSell(
        ExchangeData memory _exchangeData,
        address _from,
        address _to,
        bool _isDirect
    ) internal returns (uint256, bytes memory) {
        _exchangeData.setMaxAmountIfNeeded(_from);

        (bool handled, uint256 exchangedAmount, bytes memory logData) =
            _exchangeData.tryHandleDirectTokenConversion(_from, _to);
        if (handled) {
            return (exchangedAmount, logData);
        }

        bool isEthDest = _exchangeData.pullTokens(_from);

        // If recipe contains only one action, and that action is sell action, or if it's a direct sell execution, no fee is taken.
        if (_isDirect) {
            _exchangeData.dfsFeeDivider = 0;
        } else {
            // Only check for custom fee if a non standard fee is sent.
            if (_exchangeData.dfsFeeDivider != DFSFeeLib.SELL_STANDARD_FEE_DIVIDER) {
                _exchangeData.dfsFeeDivider = ITokenGroupRegistry(TOKEN_GROUP_REGISTRY)
                    .getFeeForTokens(_exchangeData.srcAddr, _exchangeData.destAddr);
            }
        }

        // Execute the sell with TxSaver choice.
        address wrapper;
        (wrapper, exchangedAmount,,) =
            _sellWithTxSaverChoice(_exchangeData, address(this), registry);

        _exchangeData.sendTokensAfterSell(_to, exchangedAmount, isEthDest);
        logData = _exchangeData.encodeSellLogData(wrapper, exchangedAmount);

        return (exchangedAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
