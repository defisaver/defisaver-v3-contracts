// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISubStorage } from "../../interfaces/core/ISubStorage.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { BundleStorage } from "./BundleStorage.sol";
import { StrategyStorage } from "./StrategyStorage.sol";
import { StrategyModel } from "./StrategyModel.sol";
import { CoreHelper } from "../helpers/CoreHelper.sol";

/// @title Storage of users subscriptions to strategies/bundles
contract SubStorage is StrategyModel, AdminAuth, CoreHelper, ISubStorage {
    error SenderNotSubOwnerError(address, uint256);
    error SubIdOutOfRange(uint256, bool);

    event Subscribe(
        uint256 indexed subId,
        address indexed walletAddr,
        bytes32 indexed subHash,
        StrategySub subStruct
    );
    event UpdateData(uint256 indexed subId, bytes32 indexed subHash, StrategySub subStruct);
    event ActivateSub(uint256 indexed subId);
    event DeactivateSub(uint256 indexed subId);

    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    StoredSubData[] public strategiesSubs;

    /// @notice Checks if subId is init. and if the sender is the owner
    modifier onlySubOwner(uint256 _subId) {
        if (address(strategiesSubs[_subId].walletAddr) != msg.sender) {
            revert SenderNotSubOwnerError(msg.sender, _subId);
        }
        _;
    }

    /// @notice Checks if the id is valid (points to a stored bundle/sub)
    modifier isValidId(uint256 _id, bool _isBundle) {
        if (_isBundle) {
            if (_id > (BundleStorage(BUNDLE_STORAGE_ADDR).getBundleCount() - 1)) {
                revert SubIdOutOfRange(_id, _isBundle);
            }
        } else {
            if (_id > (StrategyStorage(STRATEGY_STORAGE_ADDR).getStrategyCount() - 1)) {
                revert SubIdOutOfRange(_id, _isBundle);
            }
        }

        _;
    }

    /// @notice Adds users info and records StoredSubData, logs StrategySub
    /// @dev To save on gas we don't store the whole struct but rather the hash of the struct
    /// @param _sub Subscription struct of the user (is not stored on chain, only the hash)
    function subscribeToStrategy(StrategySub memory _sub)
        public
        override
        isValidId(_sub.strategyOrBundleId, _sub.isBundle)
        returns (uint256)
    {
        bytes32 subStorageHash = keccak256(abi.encode(_sub));

        strategiesSubs.push(StoredSubData(bytes20(msg.sender), true, subStorageHash));

        uint256 currentId = strategiesSubs.length - 1;

        emit Subscribe(currentId, msg.sender, subStorageHash, _sub);

        return currentId;
    }

    /// @notice Updates the users subscription data
    /// @dev Only callable by wallet who created the sub.
    /// @param _subId Id of the subscription to update
    /// @param _sub Subscription struct of the user (needs whole struct so we can hash it)
    function updateSubData(uint256 _subId, StrategySub calldata _sub)
        public
        override
        onlySubOwner(_subId)
        isValidId(_sub.strategyOrBundleId, _sub.isBundle)
    {
        StoredSubData storage storedSubData = strategiesSubs[_subId];

        bytes32 subStorageHash = keccak256(abi.encode(_sub));

        storedSubData.strategySubHash = subStorageHash;

        emit UpdateData(_subId, subStorageHash, _sub);
    }

    /// @notice Enables the subscription for execution if disabled
    /// @dev Must own the sub. to be able to enable it
    /// @param _subId Id of subscription to enable
    function activateSub(uint256 _subId) public override onlySubOwner(_subId) {
        StoredSubData storage sub = strategiesSubs[_subId];

        sub.isEnabled = true;

        emit ActivateSub(_subId);
    }

    /// @notice Disables the subscription (will not be able to execute the strategy for the user)
    /// @dev Must own the sub. to be able to disable it
    /// @param _subId Id of subscription to disable
    function deactivateSub(uint256 _subId) public override onlySubOwner(_subId) {
        StoredSubData storage sub = strategiesSubs[_subId];

        sub.isEnabled = false;

        emit DeactivateSub(_subId);
    }

    ///////////////////// VIEW ONLY FUNCTIONS ////////////////////////////

    function getSub(uint256 _subId) public view override returns (StoredSubData memory) {
        return strategiesSubs[_subId];
    }

    function getSubsCount() public view override returns (uint256) {
        return strategiesSubs.length;
    }
}
