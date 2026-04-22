// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IUmbrella {
    function getStkTokens() external view returns (address[] memory);
}
