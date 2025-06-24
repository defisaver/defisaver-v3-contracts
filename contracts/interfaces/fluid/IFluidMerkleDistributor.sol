// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.24;

interface IFluidMerkleDistributor {
    
    function claim(
        address recipient_,
        uint256 cumulativeAmount_,
        uint8 positionType_,
        bytes32 positionId_,
        uint256 cycle_,
        bytes32[] calldata merkleProof_,
        bytes memory metadata_
    ) external;

    function TOKEN() external view returns (address);
    
    function claimed(address user, bytes32 positionId) external view returns (uint256);
}