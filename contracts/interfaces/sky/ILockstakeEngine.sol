// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.21;

interface ILockstakeEngine {
    // --- Enums ---
    enum FarmStatus {
        UNSUPPORTED,
        ACTIVE,
        DELETED
    }

    // --- Read Functions ---
    function wards(address usr) external view returns (uint256);
    function farms(address farm) external view returns (FarmStatus);
    function ownerUrnsCount(address owner) external view returns (uint256);
    function ownerUrns(address owner, uint256 index) external view returns (address);
    function urnOwners(address urn) external view returns (address);
    function urnCan(address urn, address usr) external view returns (uint256);
    function urnVoteDelegates(address urn) external view returns (address);
    function urnFarms(address urn) external view returns (address);
    function urnAuctions(address urn) external view returns (uint256);
    function jug() external view returns (address);
    function voteDelegateFactory() external view returns (address);
    function vat() external view returns (address);
    function usdsJoin() external view returns (address);
    function usds() external view returns (address);
    function ilk() external view returns (bytes32);
    function sky() external view returns (address);
    function lssky() external view returns (address);
    function urnImplementation() external view returns (address);
    function fee() external view returns (uint256);
    function isUrnAuth(address owner, uint256 index, address usr) external view returns (bool);

    // --- Write Functions (Admin / Config) ---
    function rely(address usr) external;
    function deny(address usr) external;
    function file(bytes32 what, address data) external;
    function addFarm(address farm) external;
    function delFarm(address farm) external;

    // --- Write Functions (Urn Management) ---
    function open(uint256 index) external returns (address urn);
    function hope(address owner, uint256 index, address usr) external;
    function nope(address owner, uint256 index, address usr) external;

    // --- Write Functions (Vote / Farm Selection) ---
    function selectVoteDelegate(address owner, uint256 index, address voteDelegate) external;
    function selectFarm(address owner, uint256 index, address farm, uint16 ref) external;

    // --- Write Functions (Staking) ---
    function lock(address owner, uint256 index, uint256 wad, uint16 ref) external;
    function free(address owner, uint256 index, address to, uint256 wad) external returns (uint256 freed);
    function freeNoFee(address owner, uint256 index, address to, uint256 wad) external;

    // --- Write Functions (Loans) ---
    function draw(address owner, uint256 index, address to, uint256 wad) external;
    function wipe(address owner, uint256 index, uint256 wad) external;
    function wipeAll(address owner, uint256 index) external returns (uint256 wad);

    // --- Write Functions (Rewards) ---
    function getReward(address owner, uint256 index, address farm, address to) external returns (uint256 amt);

    // --- Write Functions (Liquidation Callbacks) ---
    function onKick(address urn, uint256 wad) external;
    function onTake(address urn, address who, uint256 wad) external;
    function onRemove(address urn, uint256 sold, uint256 left) external;
}
