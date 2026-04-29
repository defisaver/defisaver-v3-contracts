// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DFSExchangeCore } from "../../exchangeV3/DFSExchangeCore.sol";
import { TransientStorage } from "../../utils/transient/TransientStorage.sol";
import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { GasFeeHelper } from "../fee/helpers/GasFeeHelper.sol";

/// @title A special Limit Sell action used as a part of the limit order strategy
/// @dev Adds additional gas fee calculation on top of regular sell.
contract LimitSell is ActionBase, DFSExchangeCore, GasFeeHelper {
    using TokenUtils for address;

    /// @notice Used for validating the price that is set in the trigger
    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

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

        (uint256 exchangedAmount, bytes memory logData) =
            _dfsSell(params.exchangeData, params.from, params.to, params.gasUsed);
        emit ActionEvent("LimitSell", logData);
        return bytes32(exchangedAmount);
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
    /// @param _exchangeData DFS Exchange data struct
    /// @param _from Address from which we'll pull the srcTokens
    /// @param _to Address where we'll send the _to token
    /// @param _gasUsed Gas used for this strategy so we can take the fee
    function _dfsSell(
        ExchangeData memory _exchangeData,
        address _from,
        address _to,
        uint256 _gasUsed
    ) internal returns (uint256, bytes memory) {
        // If we set srcAmount to max, take the whole user's wallet balance.
        if (_exchangeData.srcAmount == type(uint256).max) {
            _exchangeData.srcAmount = _exchangeData.srcAddr.getBalance(address(this));
        }

        // Validate price that is set in the trigger.
        uint256 currPrice = uint256(tempStorage.getBytes32("CURR_PRICE"));
        if (currPrice == 0) revert PriceNotSetError();

        // No sell fee for limit sell strategies.
        _exchangeData.dfsFeeDivider = 0;

        // If the price is not the expected price, revert.
        if (_exchangeData.minPrice != currPrice) {
            revert WrongPriceFromTrigger(currPrice, _exchangeData.minPrice);
        }

        // Pull the source tokens for selling.
        _exchangeData.srcAddr.pullTokensIfNeeded(_from, _exchangeData.srcAmount);

        // Execute the sell.
        (address wrapper, uint256 exchangedAmount) = _sell(_exchangeData);

        {
            // Take the gas fee from the sold amount.
            uint256 amountAfterFee = _takeGasFee(_gasUsed, exchangedAmount, _exchangeData.destAddr);

            // If the destination token is WETH, withdraw it and convert to ETH.
            if (_exchangeData.destAddr == TokenUtils.WETH_ADDR) {
                TokenUtils.withdrawWeth(amountAfterFee);
                _exchangeData.destAddr = TokenUtils.ETH_ADDR;
            }

            // Send the tokens to the recipient. Also handles raw ETH sending.
            _exchangeData.destAddr.withdrawTokens(_to, amountAfterFee);
        }

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
