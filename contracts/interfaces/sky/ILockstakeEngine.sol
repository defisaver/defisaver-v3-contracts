// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface ILockstakeEngine {
    /// @notice Grants authorization to an address
    /// @dev Adds the specified address to the list of authorized accounts (`wards`).
    /// Only addresses with existing authorization can grant new ones.
    /// This is typically used for granting admin or system-level permissions.
    /// Emits a `Rely` event upon success.
    function rely(address usr) external;

    /// @notice Revokes authorization from an address
    /// @dev Removes the specified address from the list of authorized accounts (`wards`).
    /// Only currently authorized users can perform this action.
    /// Used to limit access or remove control from a previously trusted address.
    /// Emits a `Deny` event on successful revocation.
    function deny(address usr) external;

    /// @notice Sets configuration parameters (currently only 'jug' is supported)
    /// @dev Allows the authorized user to update contract-wide dependencies or parameters.
    /// The `what` argument specifies the parameter being changed (e.g., "jug").
    /// The `data` argument provides the new address or value to set.
    /// Used primarily for maintaining or upgrading dependencies.
    function file(bytes32 what, address data) external;

    /// @notice Adds a farm and marks it as active
    /// @dev Registers a new staking farm that users can select for rewards.
    /// Farms are associated with urns for yield farming and vote delegation.
    /// Only authorized users can add new farms to the system.
    /// This makes the farm available for future `selectFarm` calls.
    function addFarm(address farm) external;

    /// @notice Deletes a farm by marking its status as DELETED
    /// @dev Marks the farm as deleted without actually removing it from storage.
    /// Prevents further interaction or selection by users.
    /// Useful for deprecating farms while preserving historical data.
    /// Only callable by authorized addresses.
    function delFarm(address farm) external;

    /// @notice Checks whether a user is authorized for a given urn
    /// @dev Verifies if a user (`usr`) has permission to operate an urn owned by `owner` at a specific `index`.
    /// Returns `true` if authorized, otherwise `false`.
    /// This supports permissioned operations on vaults across different users.
    /// Can be used off-chain or by contracts to enforce access control.
    function isUrnAuth(address owner, uint256 index, address usr) external view returns (bool ok);

    /// @notice Opens a new urn at a specific index for the sender
    /// @dev Deploys a new urn proxy (vault) and assigns it to the caller at the specified index.
    /// Each user can have multiple urns, each uniquely identified by an index.
    /// The urn will hold locked SKY, lssky, and manage debt positions.
    /// Returns the address of the newly created urn.
    function open(uint256 index) external returns (address urn);

    /// @notice Authorizes a user to operate a specific urn
    /// @dev Grants permission to another address to act on behalf of the urn owner.
    /// This is useful for delegation or multi-sig operations on a vault.
    /// Authorization is scoped to a specific `owner` and `index`.
    /// Does not transfer ownership, only grants access.
    function hope(address owner, uint256 index, address usr) external;

    /// @notice Revokes a user's authorization on a specific urn
    /// @dev Removes the granted permission from a previously authorized user.
    /// Only the urn owner or an authorized user can revoke access.
    /// Affects only the specified urn at `index`.
    /// Helps enforce tighter access controls.
    function nope(address owner, uint256 index, address usr) external;

    /// @notice Selects a vote delegate for a specific urn
    /// @dev Sets a delegate address for governance voting using staked SKY in the urn.
    /// Enables token-weighted delegation for decentralized governance participation.
    /// Can only be updated by the urn owner or an authorized user.
    /// Emits a `SelectVoteDelegate` event on success.
    function selectVoteDelegate(address owner, uint256 index, address voteDelegate) external;

    /// @notice Selects a farm for a specific urn
    /// @dev Sets which staking farm a particular urn will use to earn rewards.
    /// The `ref` parameter is used for referral tracking.
    /// Can only be called by the urn owner or an authorized user.
    /// Emits a `SelectFarm` event to indicate the association.
    function selectFarm(address owner, uint256 index, address farm, uint16 ref) external;

    /// @notice Locks SKY into the urn, mints lssky, and stakes it in farm and/or delegate
    /// @dev Transfers SKY from the caller to the urn, and mints lssky to represent the locked position.
    /// Stakes lssky into the associated farm and/or assigns voting power.
    /// The `ref` argument may be used for referral tracking.
    /// Only callable by urn owner or authorized user.
    /// Increases the vault’s collateral value.
    function lock(address owner, uint256 index, uint256 wad, uint16 ref) external;

    /// @notice Frees SKY from an urn, applies fee, and transfers to user
    /// @dev Unstakes and burns the corresponding amount of lssky, then releases SKY to the `to` address.
    /// Applies a fee on the withdrawal, reducing the net returned amount.
    /// Only callable by the urn owner or an authorized user.
    /// Returns the actual amount of SKY transferred after fees.
    function free(address owner, uint256 index, address to, uint256 wad) external returns (uint256 freed);

    /// @notice Frees SKY from an urn with no fee, only callable by authorized users
    /// @dev Similar to `free`, but skips the withdrawal fee step.
    /// Used for system-level operations like liquidation or migrations.
    /// Can only be called by authorized addresses.
    /// SKY is transferred directly without deductions.
    function freeNoFee(address owner, uint256 index, address to, uint256 wad) external;

    /// @notice Draws USDS loan from a specific urn and sends to user
    /// @dev Increases the vault’s debt balance by minting USDS and sending it to the `to` address.
    /// Can only be called by the urn owner or an authorized user.
    /// Subject to collateralization checks enforced by `Jug` and risk modules.
    /// Updates internal debt accounting in the urn.
    function draw(address owner, uint256 index, address to, uint256 wad) external;

    /// @notice Repays USDS loan to a specific urn
    /// @dev Burns USDS from the caller and reduces the debt of the specified urn.
    /// Callable by anyone who has permission on the urn.
    /// Reduces risk and improves the vault’s health ratio.
    /// Partial repayments are supported.
    function wipe(address owner, uint256 index, uint256 wad) external;

    /// @notice Fully repays the USDS debt for a specific urn
    /// @dev Calculates the full outstanding debt of the urn and burns that amount of USDS.
    /// Returns the total amount burned.
    /// Leaves the vault in a debt-free state while maintaining locked collateral.
    /// Callable only by the urn owner or an authorized user.
    function wipeAll(address owner, uint256 index) external returns (uint256 wad);

    /// @notice Claims staking reward from a farm for a specific urn and sends to user
    /// @dev Claims accrued rewards from the selected farm associated with the urn.
    /// Rewards are transferred to the specified `to` address.
    /// Useful for harvesting yield without unlocking or withdrawing the position.
    /// Emits a `RewardClaimed` or similar event (if implemented).
    function getReward(address owner, uint256 index, address farm, address to) external returns (uint256 amt);

    /// @notice Called during liquidation to remove vote delegate and farm, and burn lssky
    /// @dev Used internally by the liquidation engine to clean up urn state.
    /// Clears the farm and vote delegate settings, and burns lssky to unwind the position.
    /// Can only be called by authorized system contracts.
    /// Prevents further interactions with the urn until resolved.
    function onKick(address urn, uint256 wad) external;

    /// @notice Called during liquidation to transfer SKY to auction buyer
    /// @dev Transfers SKY from the urn to the liquidation winner.
    /// Called by the auction module to settle a successful bid.
    /// Only callable by an authorized liquidation contract.
    /// Ensures SKY moves securely to the buyer during liquidation.
    function onTake(address urn, address who, uint256 wad) external;

    /// @notice Called during liquidation to burn fee and refund excess SKY
    /// @dev Final cleanup call after an auction finishes.
    /// Burns the auction fee from the urn and returns leftover SKY to the vault owner or system.
    /// Only callable by an authorized contract.
    /// Used to close out liquidation state cleanly.
    function onRemove(address urn, uint256 sold, uint256 left) external;
}
