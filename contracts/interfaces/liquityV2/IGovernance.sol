// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IGovernance {
    function deriveUserProxyAddress(address) external view returns (address);
    function depositLQTY(uint256 _lqtyAmount, bool _doSendRewards, address _recipient) external;
    function withdrawLQTY(uint256 _lqtyAmount, bool _doSendRewards, address _recipient) external;
    function claimFromStakingV1(address _rewardRecipient) external returns (uint256 lusdSent, uint256 ethSent);
    function resetAllocations(address[] calldata _initiativesToReset, bool checkAll) external;
}
