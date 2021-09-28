// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../auth/AdminAuth.sol";
import "../../interfaces/IDSProxy.sol";
import "../../utils/DefisaverLogger.sol";
import "./StrategyModel.sol";

/// @title Storage of users subscriptions to strategies
contract SubStorage is StrategyModel, AdminAuth {
    error NonexistantSubError(uint256);
    error SenderNotSubOwnerError(address, uint256);
    error UserPositionsEmpty();

    event Subscribe(uint256);
    event UpdateData(uint256);
    event ActivateSub(uint256);
    event DeactivateSub(uint256);
    event RemoveSub(uint256);

    modifier onlySubOwner(uint256 _subId) {
        if (strategiesSubs[_subId].userProxy == address(0)) {
            revert NonexistantSubError(_subId);
        }

        if (strategiesSubs[_subId].userProxy != msg.sender) {
            revert SenderNotSubOwnerError(msg.sender, _subId);
        }
        _;
    }

    /// @dev The order of strategies might change as they are deleted
    StrategySub[] public strategiesSubs;

    /// @notice Creates a new strategy with an existing template
    /// @param _strategyId Id of the strategy beding subscribed to
    /// @param _active If the strategy is turned on at the start
    /// @param _triggerData Subscription data for triggers
    /// @param _subData Subscription data for recipe
    function subscribeToStrategy(
        uint64 _strategyId,
        bool _active,
        bytes[] memory _triggerData,
        bytes32[] memory _subData,
        bytes memory _dataPool
    ) public returns (uint) {
        strategiesSubs.push(
            StrategySub({
                strategyId: _strategyId,
                active: _active,
                userProxy: msg.sender, // TODO: should we check if the user is dsproxy?
                triggerData: _triggerData,
                subData: _subData,
                dataPool: _dataPool
            })
        );

        uint256 currentId = strategiesSubs.length - 1;

        emit Subscribe(currentId);

        return currentId;
    }

    /// @notice Updates the users strategy
    /// @dev Only callable by proxy who created the strategy
    /// @param _subId Id of the subscription to update
    /// @param _triggerData Subscription data for triggers
    /// @param _subData Subscription data for recipe
    function updateSubData(
        uint256 _subId,
        bytes[] memory _triggerData,
        bytes32[] memory _subData
    ) public onlySubOwner(_subId) {
        StrategySub storage sub = strategiesSubs[_subId];

        if (_triggerData.length > 0){
            sub.triggerData = _triggerData;
        }
        if (_subData.length > 0){
            sub.subData = _subData;
        }

        emit UpdateData(_subId);
    }

    /// @notice Updates the users strategy trigger data
    /// @dev Only callable by proxy who created the strategy
    /// @param _subId Id of the subscription to update
    /// @param _triggerData Subscription data for triggers
    function updateSubTriggerData(
        uint256 _subId,
        bytes memory _triggerData,
        uint256 _triggerNum
    ) public onlySubOwner(_subId) {
        StrategySub storage sub = strategiesSubs[_subId];
        
        sub.triggerData[_triggerNum] = _triggerData;

        emit UpdateData(_subId);
    }

    function activateSub(
        uint _subId
    ) public onlySubOwner(_subId) {
        StrategySub storage sub = strategiesSubs[_subId];

        sub.active = true;

        emit ActivateSub(_subId);
    }

    function deactivateSub(
        uint _subId
    ) public onlySubOwner(_subId) {
        StrategySub storage sub = strategiesSubs[_subId];

        sub.active = false;

        emit DeactivateSub(_subId);
    }

    /// @notice Unsubscribe an existing subscription
    /// @dev Only callable by proxy who created the subsctiption
    /// @param _subId Subscription id
    function removeSub(uint256 _subId) public onlySubOwner(_subId) {
        uint lastSub = strategiesSubs.length - 1;

        strategiesSubs[_subId] = strategiesSubs[lastSub]; // last sub put in place of the deleted one
        strategiesSubs.pop(); // delete last subscription, because it moved

        emit RemoveSub(_subId);

    }

    ///////////////////// VIEW ONLY FUNCTIONS ////////////////////////////

    function getSub(uint _subId) public view returns (StrategySub memory) {
        return strategiesSubs[_subId];
    }

    function getSubsCount() public view returns (uint256) {
        return strategiesSubs.length;
    }

    function getPaginatedSubs(uint _page, uint _perPage) public view returns (StrategySub[] memory) {
        StrategySub[] memory subsPerPage = new StrategySub[](_perPage);

        uint start = _page * _perPage;
        uint end = start + _perPage;

        end = (end > subsPerPage.length) ? subsPerPage.length : end;

        uint count = 0;
        for (uint i = start; i < end; i++) {
            subsPerPage[count] = strategiesSubs[i];
            count++;
        }

        return subsPerPage;
    }
}
