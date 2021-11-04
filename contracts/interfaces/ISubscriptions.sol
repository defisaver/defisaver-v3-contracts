// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

interface ISubscriptions {
    function unsubscribe() external;
    function unsubscribe(uint256 _cdpId) external;
}