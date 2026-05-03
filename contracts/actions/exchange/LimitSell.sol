// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DFSExchangeCore } from "../../exchangeV3/DFSExchangeCore.sol";
import { TransientStorageCancun } from "../../utils/transient/TransientStorageCancun.sol";
import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { SellActionHelper } from "./helpers/SellActionHelper.sol";
import { GasFeeHelper } from "../fee/helpers/GasFeeHelper.sol";

/// @title A special Limit Sell action used as a part of the limit order strategy
/// @dev Adds additional gas fee calculation on top of regular sell.
contract LimitSell is ActionBase, DFSExchangeCore, GasFeeHelper {
    using TokenUtils for address;
    using SellActionHelper for ExchangeData;

    /// @notice Used for validating the price that is set in the trigger
    TransientStorageCancun public constant tempStorage =
        TransientStorageCancun(TRANSIENT_STORAGE_CANCUN);

    /// @notice Error thrown when the price is not the expected price
    /// @param expected Expected price
    /// @param actual Actual price
    error WrongPriceFromTrigger(uint256 expected, uint256 actual);

    /// @notice Error thrown when the price is not set
    error PriceNotSetError();

    /// @notice Parameters for the LimitSell action
    /// @param exchangeData Exchange data
    /// @param from Address from which we'll pull the srcTokens
    /// @param to Address where we'll send the _to token
    /// @param gasUsed Gas used for this strategy so we can take the fee
    struct Params {
        ExchangeData exchangeData;
        address from;
        address to;
        uint256 gasUsed;
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

        (uint256 exchangedAmountAfterFee, bytes memory logData) = _dfsSell(params);
        emit ActionEvent("LimitSell", logData);
        return bytes32(exchangedAmountAfterFee);
    }

    /// @inheritdoc ActionBase
    /// @dev No direct action as it's a part of the limit order strategy
    function executeActionDirect(bytes memory _callData) public payable virtual override { }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Sells a specified srcAmount for the dest token
    /// @param _params Parameters for the LimitSell action
    /// @return exchangedAmountAfterFee Amount of tokens after the fee is taken
    /// @return logData Log data for the LimitSell action
    function _dfsSell(Params memory _params)
        internal
        returns (uint256 exchangedAmountAfterFee, bytes memory logData)
    {
        ExchangeData memory exchangeData = _params.exchangeData;

        // If we set srcAmount to max, take the whole balance of the source token.
        // Limit sell only works with ERC20 tokens, for ETH token, WETH is used as source token.
        if (exchangeData.srcAmount == type(uint256).max) {
            exchangeData.srcAmount = exchangeData.srcAddr.getBalance(_params.from);
        }

        // Validate price that is set in the trigger.
        uint256 currPrice = uint256(tempStorage.getBytes32("CURR_PRICE"));
        if (currPrice == 0) revert PriceNotSetError();

        // No sell fee for limit sell strategies.
        exchangeData.dfsFeeDivider = 0;

        // If the price is not the expected price, revert.
        if (exchangeData.minPrice != currPrice) {
            revert WrongPriceFromTrigger(currPrice, exchangeData.minPrice);
        }

        // Pull the source tokens for selling.
        exchangeData.srcAddr.pullTokensIfNeeded(_params.from, exchangeData.srcAmount);

        // Execute the sell.
        (address wrapper, uint256 exchangedAmount) = _sell(exchangeData);

        // Take the gas fee from the sold amount.
        exchangedAmountAfterFee =
            _takeGasFee(_params.gasUsed, exchangedAmount, exchangeData.destAddr);

        bool unwrapEth = exchangeData.destAddr == TokenUtils.WETH_ADDR;
        exchangeData.sendTokensAfterSell(_params.to, exchangedAmountAfterFee, unwrapEth);

        logData = exchangeData.encodeSellLogData(wrapper, exchangedAmount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    /// @notice Takes the gas fee from the sold amount
    /// @param _gasUsed Gas used for this strategy so we can take the fee
    /// @param _soldAmount Amount of tokens sold
    /// @param _feeToken Token in which the gas fee is taken
    /// @return amountAfterFee Amount of tokens after the fee is taken
    function _takeGasFee(uint256 _gasUsed, uint256 _soldAmount, address _feeToken)
        internal
        returns (uint256 amountAfterFee)
    {
        uint256 gasFeeCost = calcGasCost(_gasUsed, _feeToken, 0);

        // Cap at 20% of the sold amount.
        if (gasFeeCost >= (_soldAmount / 5)) {
            gasFeeCost = _soldAmount / 5;
        }

        _feeToken.withdrawTokens(feeRecipient.getFeeAddr(), gasFeeCost);

        return _soldAmount - gasFeeCost;
    }
}
