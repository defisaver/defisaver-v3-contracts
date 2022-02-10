// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../core/DFSRegistry.sol";
import "../core/helpers/CoreHelper.sol";

/// @title MultiDFSRegistrySetter Adds multiple entries in DFS Registry
/// @dev Contract must have auth in DFSRegistry in order for this to work
contract MultiDFSRegistrySetter is CoreHelper {
    address internal owner = 0x76720aC2574631530eC8163e4085d6F98513fb27;

    modifier onlyOwner() {
        require(msg.sender == owner, "Wrong owner");

        _;
    }

    /// @notice Adds multiple entries to DFSRegistry
    /// @param _ids Ids used to fetch contract addresses
    /// @param _contractAddrs Array of contract addresses matching the ids
    /// @param _waitPeriods Array of wait periods (used for contract change)
    function addMultipleEntries(
        bytes4[] calldata _ids,
        address[] calldata _contractAddrs,
        uint256[] calldata _waitPeriods
    ) external onlyOwner {
        require(
            (_ids.length == _contractAddrs.length) && (_ids.length == _waitPeriods.length),
            "Arr length not eq"
        );

        for (uint256 i = 0; i < _ids.length; ++i) {
            DFSRegistry(REGISTRY_ADDR).addNewContract(_ids[i], _contractAddrs[i], _waitPeriods[i]);
        }
    }

    /// @notice Starts multiple entries changes to DFSRegistry
    /// @param _ids Ids used to fetch contract addresses
    /// @param _contractAddrs Array of contract addresses matching the ids
    function startMultipleContractChanges(bytes4[] calldata _ids, address[] calldata _contractAddrs)
        external
        onlyOwner
    {
        require(_ids.length == _contractAddrs.length, "Arr length not eq");

        for (uint256 i = 0; i < _ids.length; ++i) {
            DFSRegistry(REGISTRY_ADDR).startContractChange(_ids[i], _contractAddrs[i]);
        }
    }

    /// @notice Approves multiple entries changes to DFSRegistry
    /// @dev In order to work all entries must have expired wait times
    /// @param _ids Ids used to fetch contract addresses
    function approveMultipleContractChanges(bytes4[] calldata _ids) external onlyOwner {
        for (uint256 i = 0; i < _ids.length; ++i) {
            DFSRegistry(REGISTRY_ADDR).approveContractChange(_ids[i]);
        }
    }
}
