// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../exchange/DFSExchangeCore.sol";
import "../ActionBase.sol";

contract DFSSell is ActionBase, DFSExchangeCore {
    using SafeERC20 for IERC20;

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) override public payable returns (bytes32) {
        (ExchangeData memory exchangeData, address from, address to) 
            = parseParamData(_callData, _subData, _paramMapping, _returnValues);

        pullTokens(exchangeData.srcAddr, from, exchangeData.srcAmount);


        (, uint exchangedAmount) = _sell(exchangeData);


        withdrawTokens(exchangeData.destAddr, to, exchangedAmount);

        logger.Log(address(this), msg.sender, "DfsSell",
            abi.encode(
                exchangeData.srcAddr,
                exchangeData.destAddr,
                exchangeData.srcAddr,
                exchangeData.destAddr,
                exchangedAmount
        ));

        return bytes32(exchangedAmount);
    }

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function pullTokens(address _token, address _from, uint _amount) internal {
        if (_from != address(0) && _token != KYBER_ETH_ADDRESS) {
            IERC20(_token).safeTransferFrom(_from, address(this), _amount);
        }
    }

    function withdrawTokens(address _token, address _to, uint _amount) internal {
        if (_to != address(0) || _to != address(this)) {
            if (_token != KYBER_ETH_ADDRESS) {
                IERC20(_token).safeTransfer(_to, _amount);
            } else {
                payable(_to).transfer(_amount);
            }
        }
    }

    function parseParamData(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public pure returns (ExchangeData memory exchangeData, address from, address to) {
        from = abi.decode(_callData[1], (address));
        to = abi.decode(_callData[2], (address));

        exchangeData = unpackExchangeData(_callData[0]);

        exchangeData.srcAddr = _parseParamAddr(exchangeData.srcAddr, _paramMapping[0], _subData, _returnValues);
        exchangeData.destAddr = _parseParamAddr(exchangeData.destAddr, _paramMapping[1], _subData, _returnValues);

        exchangeData.srcAmount = _parseParamUint(exchangeData.srcAmount, _paramMapping[2], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[4], _subData, _returnValues);
    }

}
