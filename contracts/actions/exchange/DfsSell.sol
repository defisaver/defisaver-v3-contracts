// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../exchange/DFSExchangeCore.sol";
import "../ActionBase.sol";
import "../../utils/GasBurner.sol";

contract DFSSell is ActionBase, DFSExchangeCore, GasBurner {
    using SafeERC20 for IERC20;

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
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

        exchangeData.srcAmount = _parseParamUint(
            exchangeData.srcAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[4], _subData, _returnValues);

        uint256 exchangedAmount = _dfsSell(exchangeData, from, to);

        return bytes32(exchangedAmount);
    }

    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (ExchangeData memory exchangeData, address from, address to) = parseInputs(_callData);

        _dfsSell(exchangeData, from, to);
    }

    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _dfsSell(
        ExchangeData memory exchangeData,
        address _from,
        address _to
    ) internal returns (uint256) {
        pullTokens(exchangeData.srcAddr, _from, exchangeData.srcAmount);

        (, uint256 exchangedAmount) = _sell(exchangeData);

        withdrawTokens(exchangeData.destAddr, _to, exchangedAmount);

        logger.Log(
            address(this),
            msg.sender,
            "DfsSell",
            abi.encode(
                exchangeData.srcAddr,
                exchangeData.destAddr,
                exchangeData.srcAddr,
                exchangeData.destAddr,
                exchangedAmount
            )
        );

        return exchangedAmount;
    }

    function pullTokens(
        address _token,
        address _from,
        uint256 _amount
    ) internal {
        if (_from != address(0) && _token != KYBER_ETH_ADDRESS) {
            IERC20(_token).safeTransferFrom(_from, address(this), _amount);
        }
    }

    function withdrawTokens(
        address _token,
        address _to,
        uint256 _amount
    ) internal {
        if (_to != address(0) || _to != address(this)) {
            if (_token != KYBER_ETH_ADDRESS) {
                IERC20(_token).safeTransfer(_to, _amount);
            } else {
                payable(_to).transfer(_amount);
            }
        }
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
}
