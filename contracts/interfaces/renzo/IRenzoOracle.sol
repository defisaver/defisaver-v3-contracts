// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IRenzoOracle {
    function calculateMintAmount(
        uint256 _currentValueInProtocol,
        uint256 _newValueAdded,
        uint256 _existingEzETHSupply
    ) external pure returns (uint256);
}
