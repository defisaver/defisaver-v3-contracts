// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

interface ICollSurplusPool {
    function getCollBalance() external view returns (uint256);

    function getCollateral(address _account) external view returns (uint256);

    function accountSurplus(address _account, uint256 _amount) external;

    function claimColl(address _account) external;
}
