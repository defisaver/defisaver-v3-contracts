// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IRewardsDistributor {
    function claimed(
        address account
    ) external view returns (uint256);

    function claim(
        address _account,
        uint256 _claimable,
        bytes32[] calldata _proof
    ) external;
}
