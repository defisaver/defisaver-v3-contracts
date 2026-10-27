// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDFSRegistry } from "../interfaces/core/IDFSRegistry.sol";
import { IDFSWallet } from "../interfaces/dfsWallet/IDFSWallet.sol";
import { DFSWallet } from "./DFSWallet.sol";
import {
    DFSWalletFactoryHelper
} from "../utils/addresses/dfsWalletFactory/DFSWalletFactoryHelper.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";

/// @title DFSWalletFactory - DFS Wallets deployment and ownership discovery
/// @notice Tracks multiple wallets per owner and supports user/admin exclusions.
/// @dev Discovery does not certify that a wallet or its retained permissions are trusted.
contract DFSWalletFactory is AdminAuth, DFSWalletFactoryHelper {
    /*//////////////////////////////////////////////////////////////
                            CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice DFS Registry address supplied to newly deployed wallets.
    IDFSRegistry public constant DFS_REGISTRY = IDFSRegistry(DFS_WALLET_REGISTRY_ADDR);

    /*//////////////////////////////////////////////////////////////
                            STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Permanent provenance for wallets created by this factory.
    mapping(address wallet => bool created) public isWallet;

    /// @notice Last owner recorded by the wallet ownership callback.
    mapping(address wallet => address owner) public trackedOwner;

    /// @notice Discoverable wallets mapping.
    /// @dev Removal uses swap-and-pop.
    mapping(address owner => address[] wallets) private wallets;

    /// @notice One-based discovery index; zero means absent.
    mapping(address owner => mapping(address wallet => uint256 index)) public indexPlusOne;

    /// @notice Exclusions persist across ownership changes.
    mapping(address owner => mapping(address wallet => bool excluded)) public excluded;

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    event Created(address indexed sender, address indexed owner, address wallet);
    event OwnerSynced(address indexed wallet, address indexed previousOwner, address indexed owner);
    event ExclusionUpdated(address indexed user, address indexed wallet, bool excluded);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidWallet();
    error NotCurrentOwner();
    error Unauthorized();

    /*//////////////////////////////////////////////////////////////
                           MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyUserOrAdmin(address _user) {
        if (msg.sender != _user && msg.sender != adminVault.owner()) revert Unauthorized();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                             PUBLIC
    //////////////////////////////////////////////////////////////*/

    /// @notice Creates a wallet owned by the caller.
    function build() external returns (DFSWallet) {
        return build(msg.sender);
    }

    /// @notice Creates a wallet for a nonzero owner.
    function build(address _owner) public returns (DFSWallet wallet) {
        wallet = new DFSWallet(_owner, DFS_REGISTRY);
        isWallet[address(wallet)] = true;
        trackedOwner[address(wallet)] = _owner;
        _addWallet(_owner, address(wallet));
        emit Created(msg.sender, _owner, address(wallet));
    }

    /// @notice Synchronizes ownership; callable only by a wallet created here.
    function syncOwner() external {
        if (!isWallet[msg.sender]) revert InvalidWallet();
        address previous = trackedOwner[msg.sender];
        address current = IDFSWallet(msg.sender).owner();
        if (previous == current) return;
        _removeWallet(previous, msg.sender);
        trackedOwner[msg.sender] = current;
        _addWallet(current, msg.sender);
        emit OwnerSynced(msg.sender, previous, current);
    }

    /// @notice Excludes a wallet from discovery without changing its permissions.
    function excludeWallet(address _user, address _wallet) external onlyUserOrAdmin(_user) {
        if (!isWallet[_wallet]) revert InvalidWallet();
        excluded[_user][_wallet] = true;
        _removeWallet(_user, _wallet);
        emit ExclusionUpdated(_user, _wallet, true);
    }

    /// @notice Restores a wallet currently owned by the user.
    function restoreWallet(address _user, address _wallet) external onlyUserOrAdmin(_user) {
        if (!isWallet[_wallet]) revert InvalidWallet();
        if (IDFSWallet(_wallet).owner() != _user) revert NotCurrentOwner();
        excluded[_user][_wallet] = false;
        _addWallet(_user, _wallet);
        emit ExclusionUpdated(_user, _wallet, false);
    }

    /// @notice Returns the number of discoverable wallets for a user.
    function walletCount(address _user) external view returns (uint256) {
        return wallets[_user].length;
    }

    /// @notice Returns all discoverable wallets owned by a user.
    /// @dev Ordering can change when wallets are removed.
    /// @dev Intentionally not paginated.
    function getWallets(address _user) external view returns (address[] memory) {
        return wallets[_user];
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL
    //////////////////////////////////////////////////////////////*/

    /// @notice Adds a wallet unless already listed or excluded.
    function _addWallet(address _user, address _wallet) internal {
        if (excluded[_user][_wallet] || indexPlusOne[_user][_wallet] != 0) return;
        wallets[_user].push(_wallet);
        indexPlusOne[_user][_wallet] = wallets[_user].length;
    }

    /// @notice Removes a listed wallet using swap-and-pop.
    function _removeWallet(address _user, address _wallet) internal {
        uint256 index = indexPlusOne[_user][_wallet];
        if (index == 0) return;
        address last = wallets[_user][wallets[_user].length - 1];
        wallets[_user][index - 1] = last;
        indexPlusOne[_user][last] = index;
        wallets[_user].pop();
        delete indexPlusOne[_user][_wallet];
    }
}
