// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISparkRewards {
    function claim(
        uint256 epoch,
        address account,
        address token,
        uint256 cumulativeAmount,
        bytes32 expectedMerkleRoot,
        bytes32[] calldata merkleProof
    ) external returns (uint256 claimedAmount);

    function setMerkleRoot(bytes32 merkleRoot) external;
}
