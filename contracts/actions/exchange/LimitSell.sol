// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/IDSProxy.sol";
import "../../exchangeV3/DFSExchangeCore.sol";
import "../../utils/TransientStorage.sol";
import "../fee/helpers/GasFeeHelper.sol";
import "../ActionBase.sol";

/// @title A special Limit Sell action used as a part of the limit order strategy
contract LimitSell is ActionBase, DFSExchangeCore, GasFeeHelper {

    using TokenUtils for address;

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    error WrongPriceFromTrigger(uint256 expected, uint256 actual);

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
    ) public virtual override payable returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.exchangeData.srcAddr = _parseParamAddr(
            params.exchangeData.srcAddr,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.exchangeData.destAddr = _parseParamAddr(
            params.exchangeData.destAddr,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        params.exchangeData.srcAmount = _parseParamUint(
            params.exchangeData.srcAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[4], _subData, _returnValues);

        (uint256 exchangedAmount, bytes memory logData) = _dfsSell(params.exchangeData, params.from, params.to, params.gasUsed);
        emit ActionEvent("LimitSell", logData);
        return bytes32(exchangedAmount);
    }

    /// @inheritdoc ActionBase
    /// @dev No direct action as it's a part of the limit order strategy
    function executeActionDirect(bytes memory _callData) public virtual override payable   {}

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
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
        // if we set srcAmount to max, take the whole proxy balance
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

        // set owner of the proxy as the user that is selling for offchain orders
        _exchangeData.user = getUserAddress();
        
        (address wrapper, uint256 exchangedAmount) = _sell(_exchangeData);

        uint256 amountAfterFee = _takeGasFee(_gasUsed, exchangedAmount, _exchangeData.destAddr);

        _exchangeData.destAddr.withdrawTokens(_to, amountAfterFee);

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

    /// @notice Returns the owner of the DSProxy that called the contract
    function getUserAddress() internal view returns (address) {
        IDSProxy proxy = IDSProxy(payable(address(this)));

        return proxy.owner();
    }

    function _takeGasFee(uint256 _gasUsed, uint256 _soldAmount, address _feeToken) internal returns (uint256 amountAfterFee) {
        uint256 txCost = calcGasCost(_gasUsed, _feeToken, 0);

        // cap at 20% of the max amount
        if (txCost >= (_soldAmount / 5)) {
            txCost = _soldAmount / 5;
        }

        _feeToken.withdrawTokens(feeRecipient.getFeeAddr(), txCost);

        return _soldAmount - txCost;
    }
}
