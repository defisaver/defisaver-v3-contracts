// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../interfaces/IDSProxy.sol";
import "../../exchangeV3/DFSExchangeCore.sol";
import "../ActionBase.sol";
import "hardhat/console.sol";

/// @title A exchange sell action through the dfs exchange
contract DFSSell is ActionBase, DFSExchangeCore {

    using TokenUtils for address;

    uint internal constant RECIPE_FEE = 400;
    uint internal constant DIRECT_FEE = 800;
    struct Params {
        ExchangeData exchangeData;
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
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

        uint256 exchangedAmount = _dfsSell(params.exchangeData, params.from, params.to, RECIPE_FEE);

        return bytes32(exchangedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public override payable   {
        Params memory params = parseInputs(_callData);

        _dfsSell(params.exchangeData, params.from, params.to, DIRECT_FEE);
    }

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Sells a specified srcAmount for the dest token
    /// @param _exchangeData DFS Exchange data struct
    /// @param _from Address from which we'll pull the srcTokens
    /// @param _to Address where we'll send the _to token
    /// @param _fee Fee divider for the exchange action
    function _dfsSell(
        ExchangeData memory _exchangeData,
        address _from,
        address _to,
        uint _fee
    ) internal returns (uint256) {
         // if we set srcAmount to max, take the whole proxy balance
        if (_exchangeData.srcAmount == type(uint256).max) {
            _exchangeData.srcAmount = _exchangeData.srcAddr.getBalance(address(this));
        }
        console.log(_exchangeData.srcAmount);
        _exchangeData.srcAddr.pullTokensIfNeeded(_from, _exchangeData.srcAmount);

        _exchangeData.user = getUserAddress();
        _exchangeData.dfsFeeDivider = _fee;


        (address wrapper, uint256 exchangedAmount) = _sell(_exchangeData);

        _exchangeData.destAddr.withdrawTokens(_to, exchangedAmount);

        logger.Log(
            address(this),
            msg.sender,
            "DFSSell",
            abi.encode(
                wrapper,
                _exchangeData.srcAddr,
                _exchangeData.destAddr,
                _exchangeData.srcAmount,
                exchangedAmount,
                _fee
            )
        );

        return exchangedAmount;
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
