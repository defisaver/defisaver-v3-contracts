// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.24;

interface IUmbrella {
    function getStkTokens() external view returns (address[] memory);
}