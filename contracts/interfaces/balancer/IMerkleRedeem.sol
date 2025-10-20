// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IMerkleRedeem {
    struct Claim {
        uint256 week;
        uint256 balance;
        bytes32[] merkleProof;
    }

    function claimWeeks(address _liquidityProvider, Claim[] memory claims) external;
}
