// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../auth/AdminAuth.sol";
import "../../interfaces/IDSProxy.sol";
import "../../utils/DefisaverLogger.sol";
import "./StrategyModel.sol";

/// @title Storage of users subscriptions to strategies
contract SubStorage is StrategyModel, AdminAuth {
    error NonexistentSubError(uint256);
    error SenderNotSubOwnerError(address, uint256);
    error UserPositionsEmpty();

    event Subscribe(uint256 indexed, address indexed, bytes32 indexed, StrategySub);
    event UpdateData(uint256 indexed, bytes32 indexed, StrategySub);
    event ActivateSub(uint256 indexed);
    event DeactivateSub(uint256 indexed);

    modifier onlySubOwner(uint256 _subId) {
        if (address(strategiesSubs[_subId].userProxy) == address(0)) {
            revert NonexistentSubError(_subId);
        }

        if (address(strategiesSubs[_subId].userProxy) != msg.sender) {
            revert SenderNotSubOwnerError(msg.sender, _subId);
        }
        _;
    }

    /// @dev The order of strategies might change as they are deleted
    StoredSubData[] public strategiesSubs;

    /// @notice Creates a new strategy with an existing template
    function subscribeToStrategy(
        StrategySub memory _sub
    ) public returns (uint256) {

        bytes32 subStorageHash = keccak256(abi.encode(_sub));

        strategiesSubs.push(
            StoredSubData(
                bytes20(msg.sender),
                true,
                subStorageHash
            )            
        );

        uint256 currentId = strategiesSubs.length - 1;

        emit Subscribe(currentId, msg.sender, subStorageHash, _sub);

        return currentId;
    }

    /// @notice Updates the users strategy
    /// @dev Only callable by proxy who created the strategy
    /// @param _subId Id of the subscription to update
    function updateSubData(
        uint256 _subId,
        StrategySub calldata _sub
    ) public onlySubOwner(_subId) {
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
        return strategiesSubs.length;
    }
}
