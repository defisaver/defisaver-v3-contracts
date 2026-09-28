// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IUniswapMerkleDistributor {
    function isClaimed(uint256 index) external view returns (bool);
    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof)
        external;
    function merkleRoot() external view returns (bytes32);
    function token() external view returns (address);
}
