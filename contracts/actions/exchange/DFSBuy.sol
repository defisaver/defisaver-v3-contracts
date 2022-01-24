// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/IDSProxy.sol";
import "../../exchangeV3/DFSExchangeCore.sol";
import "../ActionBase.sol";

/// @title A exchange sell action through the dfs exchange
contract DFSBuy is ActionBase, DFSExchangeCore {

    using TokenUtils for address;

    uint256 internal constant RECIPE_FEE = 400;
    uint256 internal constant DIRECT_FEE = 800;
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
    ) public payable override returns (bytes32) {
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

        params.exchangeData.destAmount = _parseParamUint(
            params.exchangeData.destAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[4], _subData, _returnValues);

        (uint256 exchangedAmount, bytes memory logData) = _dfsBuy(params.exchangeData, params.from, params.to, DIRECT_FEE);
        emit ActionEvent("DFSBuy", logData);
        return bytes32(exchangedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override   {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _dfsBuy(params.exchangeData, params.from, params.to, DIRECT_FEE);
        logger.logActionDirectEvent("DFSBuy", logData);
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
    ) internal returns (uint256, bytes memory) {
         // if we set srcAmount to max, take the whole proxy balance
        if (_exchangeData.srcAmount == type(uint256).max) {
            _exchangeData.srcAmount = _exchangeData.srcAddr.getBalance(address(this));
        }
        
        _exchangeData.srcAddr.pullTokensIfNeeded(_from, _exchangeData.srcAmount);

        uint256 balanceBefore =
            sub(_exchangeData.srcAddr.getBalance(address(this)), _exchangeData.srcAmount);

        _exchangeData.user = getUserAddress();
        _exchangeData.dfsFeeDivider = _fee;

        (address wrapper, uint256 amountBought) = _buy(_exchangeData);

        _exchangeData.destAddr.withdrawTokens(_to, _exchangeData.destAmount);

        _exchangeData.srcAddr.withdrawTokens(
            _from,
            sub(_exchangeData.srcAddr.getBalance(address(this)), balanceBefore)
        );

        bytes memory logData = abi.encode(
            wrapper,
            _exchangeData.srcAddr,
            _exchangeData.destAddr,
            amountBought,
            _exchangeData.destAmount,
            _fee
        );
        return (amountBought, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    /// @notice Returns the owner of the DSProxy that called the contract
    function getUserAddress() internal view returns (address) {
        IDSProxy proxy = IDSProxy(payable(address(this)));

        return proxy.owner();
    }
}
