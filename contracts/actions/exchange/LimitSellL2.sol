// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DFSExchangeCore } from "../../exchangeV3/DFSExchangeCore.sol";
import { TransientStorage } from "../../utils/TransientStorage.sol";
import { GasFeeHelperL2 } from "../fee/helpers/GasFeeHelperL2.sol";
import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

/// @title A special Limit Sell L2 action used as a part of the limit order strategy
/// @dev Adds different gas fee calculation on top of regular LimitSell action
contract LimitSellL2 is ActionBase, DFSExchangeCore, GasFeeHelperL2 {
    using TokenUtils for address;

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    error WrongPriceFromTrigger(uint256 expected, uint256 actual);

    struct Params {
        ExchangeData exchangeData;
        address from;
        address to;
        uint256 gasUsed;
        uint256 l1GasUsed;
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
        params.exchangeData.destAddr =
            _parseParamAddr(params.exchangeData.destAddr, _paramMapping[1], _subData, _returnValues);

        params.exchangeData.srcAmount =
            _parseParamUint(params.exchangeData.srcAmount, _paramMapping[2], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[4], _subData, _returnValues);

        (uint256 exchangedAmount, bytes memory logData) =
            _dfsSell(params.exchangeData, params.from, params.to, params.gasUsed, params.l1GasUsed);
        emit ActionEvent("LimitSellL2", logData);
        return bytes32(exchangedAmount);
    }

    /// @inheritdoc ActionBase
    /// @dev No direct action as it"s a part of the limit order strategy
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
    /// @param _l1GasUsed Gas spent on L1 to post data for L2 network
    function _dfsSell(
        ExchangeData memory _exchangeData,
        address _from,
        address _to,
        uint256 _gasUsed,
        uint256 _l1GasUsed
    ) internal returns (uint256, bytes memory) {
        // if we set srcAmount to max, take the whole user's wallet balance
        if (_exchangeData.srcAmount == type(uint256).max) {
            _exchangeData.srcAmount = _exchangeData.srcAddr.getBalance(address(this));
        }

        // Validate price that is set in the trigger
        uint256 currPrice = uint256(tempStorage.getBytes32("CURR_PRICE"));
        require(currPrice > 0, "LimitSell: Price not set");

        // Reset the current price for the next strategy
        tempStorage.setBytes32("CURR_PRICE", bytes32(0));
        _exchangeData.dfsFeeDivider = 0;

        if (_exchangeData.minPrice != currPrice) {
            revert WrongPriceFromTrigger(currPrice, _exchangeData.minPrice);
        }

        _exchangeData.srcAddr.pullTokensIfNeeded(_from, _exchangeData.srcAmount);

        (address wrapper, uint256 exchangedAmount) = _sell(_exchangeData);

        {
            uint256 amountAfterFee = _takeGasFee(_gasUsed, exchangedAmount, _exchangeData.destAddr, _l1GasUsed);

            address tokenAddr = _exchangeData.destAddr;
            if (tokenAddr == TokenUtils.WETH_ADDR) {
                TokenUtils.withdrawWeth(amountAfterFee);
                tokenAddr = TokenUtils.ETH_ADDR;
            }

            tokenAddr.withdrawTokens(_to, amountAfterFee);
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

    function _takeGasFee(uint256 _gasUsed, uint256 _soldAmount, address _feeToken, uint256 _l1GasUsed)
        internal
        returns (uint256 amountAfterFee)
    {
        uint256 txCost = calcGasCost(_gasUsed, _feeToken, _l1GasUsed);

        // cap at 20% of the max amount
        if (txCost >= (_soldAmount / 5)) {
            txCost = _soldAmount / 5;
        }

        _feeToken.withdrawTokens(feeRecipient.getFeeAddr(), txCost);

        return _soldAmount - txCost;
    }
}
