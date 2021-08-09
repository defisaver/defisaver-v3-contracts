// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

interface IMerkleReedem{

    struct Claim {
        uint256 week;
        uint256 balance;
        bytes32[] merkleProof;
    }

    function claimWeeks(
        address _liquidityProvider,
        Claim[] memory claims
    ) external;
}