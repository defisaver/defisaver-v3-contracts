// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IRewardsToken {
    function getLockedAmounts(address account)
        external
        view
        returns (uint256[] memory, uint256[] memory);

    function underlying() external view returns (address);

    function withdrawToByLockTimestamps(
        address account,
        uint256[] memory lockTimestamps,
        bool allowRemainderLoss
    ) external;

    function owner() external view returns (address);

    function setWhitelistStatus(address account, bool status) external;

    function getWithdrawAmountsByLockTimestamp(address account, uint256 lockTimestamp)
        external
        view
        returns (uint256, uint256);
    
    function depositFor(address account, uint256 amount) external;
}