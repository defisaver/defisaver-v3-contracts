// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITokenGroupRegistry } from "../../interfaces/exchange/ITokenGroupRegistry.sol";
import { DFSExchangeWithTxSaver } from "../../exchangeV3/DFSExchangeWithTxSaver.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title A exchange sell action through the dfs exchange
/// @dev Action which has wrap/unwrap WETH builtin so we don't have to bundle into a recipe
contract DFSSell is ActionBase, DFSExchangeWithTxSaver {
    using TokenUtils for address;

    // Standard default service fee is 25 bps (0.25%) on source token amount.
    uint256 internal constant STANDARD_FEE_DIVIDER = 400;

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

        // No fee is taken if recipe contains only one sell action.
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
        // If we set srcAmount to max, take the whole user's wallet balance.
        if (_exchangeData.srcAmount == type(uint256).max) {
            _exchangeData.srcAmount = _exchangeData.srcAddr.getBalance(address(this));
        }

        // If source and destination address are same we want to skip exchanging and take no fees.
        if (_exchangeData.srcAddr == _exchangeData.destAddr) {
            bytes memory sameAssetLogData = abi.encode(
                address(0),
                _exchangeData.srcAddr,
                _exchangeData.destAddr,
                _exchangeData.srcAmount,
                _exchangeData.srcAmount,
                0
            );
            return (_exchangeData.srcAmount, sameAssetLogData);
        }

        // Wrap ETH if sent directly.
        if (_exchangeData.srcAddr == TokenUtils.ETH_ADDR) {
            TokenUtils.depositWeth(_exchangeData.srcAmount);
            _exchangeData.srcAddr = TokenUtils.WETH_ADDR;
        } else {
            _exchangeData.srcAddr.pullTokensIfNeeded(_from, _exchangeData.srcAmount);
        }

        // We always swap with WETH, convert token addr when ETH sent for unwrapping later.
        bool isEthDest;
        if (_exchangeData.destAddr == TokenUtils.ETH_ADDR) {
            _exchangeData.destAddr = TokenUtils.WETH_ADDR;
            isEthDest = true;
        }

        // If recipe contains only one sell action, or if it's a direct sell execution, no fee is taken.
        if (_isDirect) {
            _exchangeData.dfsFeeDivider = 0;
        } else {
            // Only check for custom fee if a non standard fee is sent.
            if (_exchangeData.dfsFeeDivider != STANDARD_FEE_DIVIDER) {
                _exchangeData.dfsFeeDivider = ITokenGroupRegistry(TOKEN_GROUP_REGISTRY)
                    .getFeeForTokens(_exchangeData.srcAddr, _exchangeData.destAddr);
            }
        }

        // Execute the sell with TxSaver choice.
        (address wrapper, uint256 exchangedAmount,,) =
            _sellWithTxSaverChoice(_exchangeData, address(this), registry);

        // If the destination token is WETH, withdraw it and convert to ETH.
        if (isEthDest) {
            TokenUtils.withdrawWeth(exchangedAmount);
            _exchangeData.destAddr = TokenUtils.ETH_ADDR;
        }

        // Send the tokens to the recipient. Also handles raw ETH sending.
        _exchangeData.destAddr.withdrawTokens(_to, exchangedAmount);

        bytes memory logData = abi.encode(
            wrapper,
            _exchangeData.srcAddr,
            _exchangeData.destAddr,
            _exchangeData.srcAmount,
            exchangedAmount,
            _exchangeData.dfsFeeDivider
        );

        return (exchangedAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
