// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../interfaces/IDSProxy.sol";
import "../../exchangeV3/DFSExchangeCore.sol";
import "../ActionBase.sol";

/// @title A exchange sell action through the dfs exchange
contract DFSBuy is ActionBase, DFSExchangeCore {

    using TokenUtils for address;

    uint256 internal constant RECIPE_FEE = 400;
    uint256 internal constant DIRECT_FEE = 800;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        (ExchangeData memory exchangeData, address from, address to) = parseInputs(_callData);

        exchangeData.srcAddr = _parseParamAddr(
            exchangeData.srcAddr,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        exchangeData.destAddr = _parseParamAddr(
            exchangeData.destAddr,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        exchangeData.destAmount = _parseParamUint(
            exchangeData.destAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[4], _subData, _returnValues);

        uint256 exchangedAmount = _dfsBuy(exchangeData, from, to, RECIPE_FEE);

        return bytes32(exchangedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override   {
        (ExchangeData memory exchangeData, address from, address to) = parseInputs(_callData);

        _dfsBuy(exchangeData, from, to, DIRECT_FEE);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Buys an exact _destAmount of tokens
    /// @param _exchangeData Struct that contains all the exchange data
    /// @param _from Where are we pulling the tokens from
    /// @param _to Where are we sending the tokens to
    /// @param _fee Fee divider we are using based on the action
    function _dfsBuy(
        ExchangeData memory _exchangeData,
        address _from,
        address _to,
        uint256 _fee
    ) internal returns (uint256) {
         // if we set srcAmount to max, take the whole proxy balance
        if (_exchangeData.srcAmount == type(uint256).max) {
            _exchangeData.srcAmount = _exchangeData.srcAddr.getBalance(address(this));
        }
        
        _exchangeData.srcAddr.pullTokensIfNeeded(_from, _exchangeData.srcAmount);

        uint256 balanceBefore =
            _exchangeData.srcAddr.getBalance(address(this)) - _exchangeData.srcAmount;

        _exchangeData.user = getUserAddress();
        _exchangeData.dfsFeeDivider = _fee;

        (address wrapper, uint256 amountBought) = _buy(_exchangeData);

        _exchangeData.destAddr.withdrawTokens(_to, _exchangeData.destAmount);

        _exchangeData.srcAddr.withdrawTokens(
            _from,
            _exchangeData.srcAddr.getBalance(address(this)) - balanceBefore
        );

        logger.Log(
            address(this),
            msg.sender,
            "DfsBuy",
            abi.encode(
                wrapper,
                _exchangeData.srcAddr,
                _exchangeData.destAddr,
                amountBought,
                _exchangeData.destAmount,
                _fee
            )
        );

        return amountBought;
    }

    function parseInputs(bytes[] memory _callData)
        public
        pure
        returns (
            ExchangeData memory exchangeData,
            address from,
            address to
        )
    {
        exchangeData = unpackExchangeData(_callData[0]);

        from = abi.decode(_callData[1], (address));
        to = abi.decode(_callData[2], (address));
    }

    /// @notice Returns the owner of the DSProxy that called the contract
    function getUserAddress() internal view returns (address) {
        IDSProxy proxy = IDSProxy(payable(address(this)));

        return proxy.owner();
    }
}
