// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IVat {
    struct Urn {
        uint256 ink; // Locked Collateral  [wad]
        uint256 art; // Debt               [wad]
    }

    function urns(bytes32, address) external view returns (Urn memory);
    function ilks(bytes32 ilk)
        external
        view
        returns (uint256, uint256, uint256, uint256 line, uint256);
}
