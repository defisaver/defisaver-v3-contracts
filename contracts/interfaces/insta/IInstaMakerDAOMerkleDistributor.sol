// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

interface IInstaMakerDAOMerkleDistributor {
    function claim(
        uint256 index,
        uint256 vaultId,
        address dsa,
        address owner,
        uint256 rewardAmount,
        uint256 networthAmount,
        bytes32[] calldata merkleProof
    ) external;
    
    function getPosition(
        uint256 id,
        uint256 rewardAmount,
        uint256 networthAmount
    ) external view returns (
        uint256 claimableRewardAmount,
        uint256 claimableNetworth
    );
}