// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.27;

interface IFluidVaultFactory {

    /// @dev Emitted when a new token/position is minted by a vault.
    /// @param vault The address of the vault that minted the token.
    /// @param user The address of the user who received the minted token.
    /// @param tokenId The ID of the newly minted token.
    event NewPositionMinted(address indexed vault, address indexed user, uint256 indexed tokenId);
}