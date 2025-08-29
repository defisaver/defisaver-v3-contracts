// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IVat {
    struct Urn {
        uint256 ink; // Locked Collateral  [wad]
        uint256 art; // Normalised Debt    [wad]
    }

    struct Ilk {
        uint256 Art; // Total Normalised Debt     [wad]
        uint256 rate; // Accumulated Rates         [ray]
        uint256 spot; // Price with Safety Margin  [ray]
        uint256 line; // Debt Ceiling              [rad]
        uint256 dust; // Urn Debt Floor            [rad]
    }

    mapping(bytes32 => mapping(address => Urn)) public urns;
    mapping(bytes32 => Ilk) public ilks;
    mapping(bytes32 => mapping(address => uint256)) public gem; // [wad]

    function can(address, address) public view virtual returns (uint256);
    function dai(address) public view virtual returns (uint256);
    function frob(bytes32, address, address, address, int256, int256) public virtual;
    function hope(address) public virtual;
    function nope(address) public virtual;
    function move(address, address, uint256) public virtual;
    function fork(bytes32, address, address, int256, int256) public virtual;
}
