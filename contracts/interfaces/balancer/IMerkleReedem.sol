// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

interface IMerkleReedem{

    struct Claim {
        uint week;
        uint balance;
        bytes32[] merkleProof;
    }
    
    function claimWeeks(
        address _liquidityProvider,
        Claim[] memory claims
    ) external;
}