// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.24;

interface IMorphoTokenWrapper {
    function LEGACY_MORPHO() external view returns (address);
    function NEW_MORPHO() external view returns (address);
    function depositFor(address account, uint256 value) external returns (bool);
    function withdrawTo(address account, uint256 value) external returns (bool);
    function underlying() external pure returns (address);
}