// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ISemiContinuousTracker {
    error NotSubOwner(uint256, address);

    function setSubToWallet(uint256 _subId) external;
    function removeWalletForSub(uint256 _subId) external;
    function getWalletForSub(uint256 _subId) external view returns (address);
}

