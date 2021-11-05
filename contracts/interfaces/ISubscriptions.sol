// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

interface ISubscriptions {
    function unsubscribe() external;
    function unsubscribe(uint256 _cdpId) external;
    function subscribersPos(uint256) external view returns (uint256 arrPos, bool subscribed);
    function subscribersPos(address) external view returns (uint256 arrPos, bool subscribed);    
}