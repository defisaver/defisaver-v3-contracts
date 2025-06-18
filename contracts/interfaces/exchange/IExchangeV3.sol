// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

interface IExchangeV3 {
    function sell(address _srcAddr, address _destAddr, uint _srcAmount, bytes memory _additionalData) external returns (uint);
    function getSellRate(address _srcAddr, address _destAddr, uint _srcAmount, bytes memory _additionalData) external returns (uint);
}
