// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";
import "../../interfaces/IDSProxy.sol";
import "../../utils/DefisaverLogger.sol";
import "../DFSRegistry.sol";
import "./BundleStorage.sol";
import "./StrategyStorage.sol";
import "./StrategyModel.sol";

/// @title Storage of users subscriptions to strategies
contract SubStorage is StrategyModel, AdminAuth {
    error NonexistentSubError(uint256);
    error SenderNotSubOwnerError(address, uint256);
    error UserPositionsEmpty();
    error SubIdOutOfRange(uint256, bool);

    event Subscribe(uint256 indexed, address indexed, bytes32 indexed, StrategySub);
    event UpdateData(uint256 indexed, bytes32 indexed, StrategySub);
    event ActivateSub(uint256 indexed);
    event DeactivateSub(uint256 indexed);

    address public constant REGISTRY_ADDR = 0xD5cec8F03f803A74B60A7603Ed13556279376b09;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes4 constant BUNDLE_STORAGE_ID = bytes4(keccak256("BundleStorage"));
    bytes4 constant STRATEGY_STORAGE_ID = bytes4(keccak256("StrategyStorage"));

    modifier onlySubOwner(uint256 _subId) {
        if (address(strategiesSubs[_subId].userProxy) == address(0)) {
            revert NonexistentSubError(_subId);
        }

        if (address(strategiesSubs[_subId].userProxy) != msg.sender) {
            revert SenderNotSubOwnerError(msg.sender, _subId);
        }
        _;
    }

    // TODO: hard code addr to save gas later on
    modifier isValidId(uint256 _subId, bool _isBundle) {
        if (_isBundle) {
            if (_subId > BundleStorage(registry.getAddr(BUNDLE_STORAGE_ID)).getBundleCount()) {
                revert SubIdOutOfRange(_subId, _isBundle);
            }
        } else {
            if (_subId > StrategyStorage(registry.getAddr(STRATEGY_STORAGE_ID)).getStrategyCount()) {
                revert SubIdOutOfRange(_subId, _isBundle);
            }
        }

        _;
    }

    uint256 internal _subCount;
    /// @dev The order of strategies might change as they are deleted
    mapping(uint256 => StoredSubData) public strategiesSubs;

    /// @notice Creates a new strategy with an existing template
    function subscribeToStrategy(
        StrategySub memory _sub
    ) public isValidId(_sub.id, _sub.isBundle) returns (uint256) {

        bytes32 subStorageHash = keccak256(abi.encode(_sub));
        uint256 subCount = _subCount;

        strategiesSubs[_subCount++] = StoredSubData(
            bytes20(msg.sender),
            true,
            subStorageHash
        );

        emit Subscribe(subCount, msg.sender, subStorageHash, _sub);

        return subCount;
    }

    /// @notice Updates the users strategy
    /// @dev Only callable by proxy who created the strategy
    /// @param _subId Id of the subscription to update
    function updateSubData(
        uint256 _subId,
        StrategySub calldata _sub
    ) public onlySubOwner(_subId) isValidId(_sub.id, _sub.isBundle)  {
        StoredSubData storage storedSubData = strategiesSubs[_subId];

        bytes32 subStorageHash = keccak256(abi.encode(_sub));

        storedSubData.strategySubHash = subStorageHash;

        emit UpdateData(_subId, subStorageHash, _sub);
    }

    function activateSub(
        uint _subId
    ) public onlySubOwner(_subId) {
        StoredSubData storage sub = strategiesSubs[_subId];

        sub.isEnabled = true;

        emit ActivateSub(_subId);
    }

    function deactivateSub(
        uint _subId
    ) public onlySubOwner(_subId) {
        StoredSubData storage sub = strategiesSubs[_subId];

        sub.isEnabled = false;

        emit DeactivateSub(_subId);
    }

    ///////////////////// VIEW ONLY FUNCTIONS ////////////////////////////

    function getSub(uint _subId) public view returns (StoredSubData memory) {
        return strategiesSubs[_subId];
    }

    function getSubsCount() public view returns (uint256) {
        return _subCount;
    }
}
