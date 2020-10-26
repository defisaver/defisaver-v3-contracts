// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
// pragma experimental ABIEncoderV2;

// import "..exchange/SaverExchangeCore.sol";
// import "../ActionBase.sol";

// contract DfsSell is ActionBase, SaverExchangeCore {

//     function executeAction(uint _actionId, bytes memory _callData, bytes32[] memory _returnValues) override public payable returns (bytes32) {
//         (ExchangeData memory exchangeData, address from, address to) = parseParamData(_callData, _returnValues);

//         pullTokens(exchangeData.srcAddr, from, exchangeData.srcAmount);

//         (, uint exchangedAmount) = _sell(exchangeData);

//         withdrawTokens(exchangeData.destAddr, to, exchangedAmount);

//         logger.Log(address(this), msg.sender, "DfsSell",
//             abi.encode(
//                 exchangeData.srcAddr,
//                 exchangeData.destAddr,
//                 exchangeData.srcAddr,
//                 exchangeData.destAddr,
//                 exchangedAmount
//         ));

//         return bytes32(exchangedAmount);
//     }

//     function actionType() override public returns (uint8) {
//         return uint8(ActionType.STANDARD_ACTION);
//     }

//     function pullTokens(address _token, address _from, uint _amount) internal {
//         if (_from != address(0) && _token != KYBER_ETH_ADDRESS) {
//             ERC20(_token).safeTransferFrom(_from, address(this), _amount);
//         }
//     }

//     function withdrawTokens(address _token, address _to, uint _amount) internal {
//         if (_to != address(0)) {
//             if (_token != KYBER_ETH_ADDRESS) {
//                 ERC20(_token).safeTransfer(_to, _amount);
//             } else {
//                 payable(_to).transfer(_amount);
//             }
//         }
//     }

//     function parseParamData(
//         bytes memory _data,
//         bytes32[] memory _returnValues
//     ) public pure returns (ExchangeData memory exchangeData, address from, address to) {
//         uint8[] memory inputMapping;
//         bytes memory exData;

//         (exData, from, to, inputMapping) = abi.decode(_data, (bytes,address,address,uint8[]));

//         exchangeData = unpackExchangeData(exData);

//         // mapping return values to new inputs
//         if (inputMapping.length > 0 && _returnValues.length > 0) {
//             for (uint i = 0; i < inputMapping.length; i += 2) {
//                 bytes32 returnValue = _returnValues[inputMapping[i + 1]];

//                 if (inputMapping[i] == 0) {
//                     exchangeData.srcAddr = address(bytes20(returnValue));
//                 } else if (inputMapping[i] == 1) {
//                     exchangeData.destAddr = address(bytes20(returnValue));
//                 } else if (inputMapping[i] == 2) {
//                     exchangeData.srcAmount = uint(returnValue);
//                 } else if (inputMapping[i] == 3) {
//                     from = address(bytes20(returnValue));
//                 }
//             }
//         }
//     }

// }
