// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../auth/AdminAuth.sol";
import "../utils/DefisaverLogger.sol";

/// @title Stores all the important DFS addresses and can be changed (timelock)
contract DFSRegistry is AdminAuth {
    DefisaverLogger public constant logger = DefisaverLogger(
        0x5c55B921f590a89C1Ebe84dF170E655a82b62126
    );

    string public constant ERR_ENTRY_ALREADY_EXISTS = "Entry id already exists";
    string public constant ERR_ENTRY_NON_EXISTENT = "Entry id doesn't exists";
    string public constant ERR_ENTRY_NOT_IN_CHANGE = "Entry not in change process";
    string public constant ERR_WAIT_PERIOD_SHORTER = "New wait period must be bigger";

    struct Entry {
        address contractAddr;
        uint256 waitPeriod;
        uint256 changeStartTime;
        bool inChange;
        bool exists;
    }
    
    mapping(bytes32 => Entry) public entries;
    mapping(bytes32 => address) public pendingAddresses;

    /// @notice Given an contract id returns the registred address
    /// @dev Id is keccak256 of the contract name
    /// @param _id Id of contract
    function getAddr(bytes32 _id) public view returns (address) {
        return entries[_id].contractAddr;
    }

    /// @notice Helper function to easily query if id is registred
    /// @param _id Id of contract
    function isRegistered(bytes32 _id) public view returns (bool) {
        return entries[_id].exists;
    }


    /////////////////////////// OWNER ONLY FUNCTIONS ///////////////////////////

    /// @notice Adds a new contract to the registry
    /// @param _id Id of contract
    /// @param _contractAddr Address of the contract
    /// @param _waitPeriod Amount of time to wait before a contract address can be changed
    function addNewContract(
        bytes32 _id,
        address _contractAddr,
        uint256 _waitPeriod
    ) public onlyOwner {
        require(!entries[_id].exists, ERR_ENTRY_ALREADY_EXISTS);

        entries[_id] = Entry({
            contractAddr: _contractAddr,
            waitPeriod: _waitPeriod,
            changeStartTime: 0,
            inChange: false,
            exists: true
        });

        logger.Log(
            address(this),
            msg.sender,
            "AddNewContract",
            abi.encode(_id, _contractAddr, _waitPeriod)
        );
    }

    /// @notice Starts an address change for an existing entry
    /// @dev Can override a change that is currently in progress
    /// @param _id Id of contract
    /// @param _newContractAddr Address of the new contract
    function startContractChange(bytes32 _id, address _newContractAddr) public onlyOwner {
        require(entries[_id].exists, ERR_ENTRY_NON_EXISTENT);

        entries[_id].changeStartTime = block.timestamp; // solhint-disable-line
        entries[_id].inChange = true;

        pendingAddresses[_id] = _newContractAddr;

        logger.Log(
            address(this),
            msg.sender,
            "StartChange",
            abi.encode(_id, entries[_id].contractAddr, _newContractAddr)
        );
    }

    /// @notice Changes new contract address, correct time must have passed
    /// @dev Can override a change that is currently in progress
    /// @param _id Id of contract
    function approveContractChange(bytes32 _id) public onlyOwner {
        require(entries[_id].exists, ERR_ENTRY_NON_EXISTENT);
        require(entries[_id].inChange, ERR_ENTRY_NOT_IN_CHANGE);
        require(
            block.timestamp >= (entries[_id].changeStartTime + entries[_id].waitPeriod), // solhint-disable-line
            "Change not ready yet"
        );

        address oldContractAddr = entries[_id].contractAddr;
        entries[_id].contractAddr = pendingAddresses[_id];
        entries[_id].inChange = false;
        entries[_id].changeStartTime = 0;

        pendingAddresses[_id] = address(0);

        logger.Log(
            address(this),
            msg.sender,
            "ApproveChange",
            abi.encode(_id, oldContractAddr, entries[_id].contractAddr)
        );
    }

    /// @notice Cancel pending change
    /// @param _id Id of contract
    function cancelContractChange(bytes32 _id) public onlyOwner {
        require(entries[_id].exists, ERR_ENTRY_NON_EXISTENT);
        require(entries[_id].inChange, ERR_ENTRY_NOT_IN_CHANGE);

        address oldContractAddr = pendingAddresses[_id];

        pendingAddresses[_id] = address(0);
        entries[_id].inChange = false;
        entries[_id].changeStartTime = 0;

        logger.Log(
            address(this),
            msg.sender,
            "CancelChange",
            abi.encode(_id, oldContractAddr, entries[_id].contractAddr)
        );
    }

    /// @notice Changes wait period for an entry
    /// @param _id Id of contract
    /// @param _newWaitPeriod New wait time, must be bigger than before
    function changeWaitPeriod(bytes32 _id, uint256 _newWaitPeriod) public onlyOwner {
        require(entries[_id].exists, ERR_ENTRY_NON_EXISTENT);
        require(_newWaitPeriod > entries[_id].waitPeriod, ERR_WAIT_PERIOD_SHORTER);

        entries[_id].waitPeriod = _newWaitPeriod;

        logger.Log(address(this), msg.sender, "ChangeWaitPeriod", abi.encode(_id, _newWaitPeriod));
    }
}
