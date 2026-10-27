// SPDX-License-Identifier: GPL-3.0-or-later

// Copyright (C) 2017  DappHub, LLC

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity =0.8.24;

import { IDSAuthority } from "../interfaces/DS/IDSAuthority.sol";
import { IDFSRegistry } from "../interfaces/core/IDFSRegistry.sol";
import { IDFSWalletFactory } from "../interfaces/dfsWallet/IDFSWalletFactory.sol";

/// @title DFSWallet - DFSRegistry-routed delegatecall wallet
/// @dev Adapted from DappHub DSProxy (2017), modified by DeFi Saver (2026)
///      Uses registry IDs, removes cache and DSNote, and synchronizes ownership with its factory.
contract DFSWallet {
    /*//////////////////////////////////////////////////////////////
                            STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Optional external caller authorization.
    IDSAuthority public authority;

    /// @notice Current wallet owner.
    address public owner;

    /// @notice Factory responsible for ownership discovery.
    address public immutable factory;

    /// @notice Registry used to resolve execution targets.
    IDFSRegistry public immutable dfsRegistry;

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    event LogSetOwner(address indexed owner);
    event LogSetAuthority(address indexed authority);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error Unauthorized();
    error ZeroOwner();
    error InvalidTarget(bytes4 id);

    /*//////////////////////////////////////////////////////////////
                           MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier auth() {
        if (!isAuthorized(msg.sender, msg.sig)) revert Unauthorized();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                          CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param _owner Initial nonzero owner.
    /// @param _dfsRegistry Registry used for execution targets.
    constructor(address _owner, IDFSRegistry _dfsRegistry) {
        if (_owner == address(0)) revert ZeroOwner();
        owner = _owner;
        factory = msg.sender;
        dfsRegistry = _dfsRegistry;
        emit LogSetOwner(_owner);
    }

    /*//////////////////////////////////////////////////////////////
                             PUBLIC
    //////////////////////////////////////////////////////////////*/

    /// @notice Checks owner, self-call, or external authority permission.
    function isAuthorized(address _src, bytes4 _sig) public view returns (bool) {
        if (_src == address(this) || _src == owner) return true;
        return address(authority) != address(0) && authority.canCall(_src, address(this), _sig);
    }

    /// @notice Changes the owner and atomically updates factory discovery.
    /// @dev Existing authority permissions are retained.
    function setOwner(address _newOwner) external auth {
        if (_newOwner == address(0)) revert ZeroOwner();
        if (_newOwner == owner) return;
        owner = _newOwner;
        IDFSWalletFactory(factory).syncOwner();
        emit LogSetOwner(_newOwner);
    }

    /// @notice Sets the external authority; zero disables delegated permissions.
    function setAuthority(IDSAuthority _authority) external auth {
        authority = _authority;
        emit LogSetAuthority(address(_authority));
    }

    /// @notice Delegatecalls a registered contract and returns its full response.
    /// @param _targetId DFSRegistry ID of the target contract.
    /// @param _data Encoded target function call.
    /// @return Full ABI-encoded return data from the target.
    function execute(bytes4 _targetId, bytes calldata _data)
        external
        payable
        auth
        returns (bytes memory)
    {
        address target = dfsRegistry.getAddr(_targetId);
        if (target.code.length == 0) revert InvalidTarget(_targetId);
        (bool success, bytes memory result) = target.delegatecall(_data);
        if (!success) {
            assembly { revert(add(result, 32), mload(result)) }
        }
        return result;
    }

    /// @notice Accepts native ETH without executing a recipe.
    receive() external payable { }
}
