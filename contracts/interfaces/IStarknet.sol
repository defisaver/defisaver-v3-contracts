// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;
interface IStarknet {
    function sendMessageToL2(uint256 toAddress, uint256 selector, uint256[] memory payload) external payable returns (bytes32, uint256);
}
