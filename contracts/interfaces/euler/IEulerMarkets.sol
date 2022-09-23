// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IEulerMarkets {
    function underlyingToDToken(address underlying) external view returns (address);
}
