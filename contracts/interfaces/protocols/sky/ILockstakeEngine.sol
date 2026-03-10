// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.21;

interface ILockstakeEngine {
    // --- Enums ---
    enum FarmStatus {
        UNSUPPORTED,
        ACTIVE,
        DELETED
    }

    // --- Events ---
    event Open(address indexed owner, uint256 indexed index, address urn);
    event SelectFarm(
        address indexed owner, uint256 indexed index, address indexed farm, uint16 ref
    );
    event Lock(address indexed owner, uint256 indexed index, uint256 wad, uint16 ref);
    event Free(
        address indexed owner, uint256 indexed index, address to, uint256 wad, uint256 freed
    );
    event GetReward(
        address indexed owner, uint256 indexed index, address indexed farm, address to, uint256 amt
    );

    // --- Read Functions ---
    function ownerUrnsCount(address owner) external view returns (uint256);
    function ownerUrns(address owner, uint256 index) external view returns (address);
    function isUrnAuth(address owner, uint256 index, address usr) external view returns (bool);
    function urnFarms(address urn) external view returns (address);
    function vat() external view returns (address);
    function ilk() external view returns (bytes32);
    function jug() external view returns (address);

    // --- Write Functions (Urn Management) ---
    function open(uint256 index) external returns (address urn);

    // --- Write Functions (Vote / Farm Selection) ---
    function selectFarm(address owner, uint256 index, address farm, uint16 ref) external;

    // --- Write Functions (Staking) ---
    function lock(address owner, uint256 index, uint256 wad, uint16 ref) external;
    function free(address owner, uint256 index, address to, uint256 wad)
        external
        returns (uint256 freed);

    // --- Write Functions (Rewards) ---
    function getReward(address owner, uint256 index, address farm, address to)
        external
        returns (uint256 amt);
}
