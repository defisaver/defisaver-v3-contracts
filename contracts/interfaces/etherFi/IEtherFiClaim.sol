// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;


abstract contract IEtherFiClaim {
    function claim(
        address account,
        uint256 cumulativeAmount,
        bytes32 expectedMerkleRoot,
        bytes32[] calldata merkleProof
    ) external virtual;
}