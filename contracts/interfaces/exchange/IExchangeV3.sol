// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IExchangeV3 {
    function sell(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes memory _additionalData)
        external
        returns (uint256);
    function getSellRate(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes memory _additionalData)
        external
        returns (uint256);
}
