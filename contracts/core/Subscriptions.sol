// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/IDSProxy.sol";
import "../utils/DefisaverLogger.sol";
import "./StrategyData.sol";

/// @title Storage of strategies and templates
contract Subscriptions is StrategyData, AdminAuth {
    DefisaverLogger public constant logger = DefisaverLogger(0x5c55B921f590a89C1Ebe84dF170E655a82b62126);

    string public constant ERR_EMPTY_STRATEGY = "Strategy does not exist";
    string public constant ERR_SENDER_NOT_OWNER = "Sender is not strategy owner";
    string public constant ERR_USER_POS_EMPTY = "No user positions";

    /// @dev The order of strategies might change as they are deleted
    Strategy[] public strategies;

    /// @dev Templates are fixed and are non removable
    Template[] public templates;

    /// @dev Keeps track of all the users strategies (their indexes in the array)
    mapping (address => uint[]) public usersPos;

    /// @dev Increments on state change, used for easier off chain tracking of changes
    uint public updateCounter;

    /// @notice Creates a new strategy with an existing template
    /// @param _templateId Id of the template used for strategy
    /// @param _active If the strategy is turned on at the start
    /// @param _subData Subscription data for actions
    /// @param _triggerData Subscription data for triggers
    function createStrategy(
        uint _templateId,
        bool _active,
        bytes[][] memory _subData,
        bytes[][] memory _triggerData
    ) public returns (uint) {
        strategies.push(
            Strategy({
                templateId: _templateId,
                proxy: msg.sender,
                active: _active,
                subData: _subData,
                triggerData: _triggerData,
                posInUserArr: (usersPos[msg.sender].length - 1)
            })
        );

        usersPos[msg.sender].push(strategies.length - 1);

        updateCounter++;

        logger.Log(address(this), msg.sender, "CreateStrategy", abi.encode(strategies.length - 1));

        return strategies.length - 1;
    }

    /// @notice Creates a new template to use in strategies
    /// @dev Templates once created can't be changed
    /// @param _name Name of template, used mainly for logging
    /// @param _triggerIds Array of trigger ids which translate to trigger addresses
    /// @param _actionIds Array of actions ids which translate to action addresses
    /// @param _paramMapping Array that holds metadata of how inputs are mapped to sub/return data
    function createTemplate(
        string memory _name,
        bytes32[] memory _triggerIds,
        bytes32[] memory _actionIds,
        uint8[][] memory _paramMapping
    ) public returns (uint) {
        
        templates.push(
            Template({
                name: _name,
                triggerIds: _triggerIds,
                actionIds: _actionIds,
                paramMapping: _paramMapping
            })
        );

        updateCounter++;

        logger.Log(address(this), msg.sender, "CreateTemplate", abi.encode(templates.length - 1));

        return templates.length - 1;
    }

    /// @notice Updates the users strategy
    /// @dev Only callable by proxy who created the strategy
    /// @param _strategyId Id of the strategy to update
    /// @param _templateId Id of the template used for strategy
    /// @param _active If the strategy is turned on at the start
    /// @param _subData Subscription data for actions
    /// @param _triggerData Subscription data for triggers
    function updateStrategy(
        uint _strategyId,
        uint _templateId,
        bool _active,
        bytes[][] memory _subData,
        bytes[][] memory _triggerData
    ) public {
        Strategy storage s = strategies[_strategyId];

        require(s.proxy != address(0), ERR_EMPTY_STRATEGY);
        require(msg.sender == s.proxy, ERR_SENDER_NOT_OWNER);

        s.templateId = _templateId;
        s.active = _active;
        s.subData = _subData;
        s.triggerData = _triggerData;

        updateCounter++;

        logger.Log(address(this), msg.sender, "UpdateStrategy", abi.encode(_strategyId));
    }

    /// @notice Unsubscribe an existing strategy
    /// @dev Only callable by proxy who created the strategy
    /// @param _subId Subscription id
    function removeStrategy(uint256 _subId) public {
        Strategy memory s = strategies[_subId];
        require(s.proxy != address(0), ERR_EMPTY_STRATEGY);
        require(msg.sender == s.proxy, ERR_SENDER_NOT_OWNER);

        uint lastSub = strategies.length - 1;

        _removeUserPos(msg.sender, s.posInUserArr);

        strategies[_subId] = strategies[lastSub]; // last strategy put in place of the deleted one
        strategies.pop(); // delete last strategy, because it moved

        logger.Log(address(this), msg.sender, "Unsubscribe", abi.encode(_subId));
    }

    function _removeUserPos(address _user, uint _index) internal {
        require(usersPos[_user].length > 0, ERR_USER_POS_EMPTY);
        uint lastPos = usersPos[_user].length - 1;

        usersPos[_user][_index] = usersPos[_user][lastPos];
        usersPos[_user].pop();
    }

    ///////////////////// VIEW ONLY FUNCTIONS ////////////////////////////

    function getTemplateFromStrategy(uint _strategyId) public view returns (Template memory) {
        uint templateId = strategies[_strategyId].templateId;
        return templates[templateId];
    }

    function getStrategy(uint _strategyId) public view returns (Strategy memory) {
        return strategies[_strategyId];
    }

    function getTemplate(uint _templateId) public view returns (Template memory) {
        return templates[_templateId];
    }

    function getStrategyCount() public view returns (uint256) {
        return strategies.length;
    }

    function getTemplateCount() public view returns (uint256) {
        return templates.length;
    }

    function getStrategies() public view returns (Strategy[] memory) {
        return strategies;
    }

    function getTemplates() public view returns (Template[] memory) {
        return templates;
    }

    function userHasStrategies(address _user) public view returns (bool) {
        return usersPos[_user].length > 0;
    }

    function getUserStrategies(address _user) public view returns (Strategy[] memory) {
        Strategy[] memory userStrategies = new Strategy[](usersPos[_user].length);
        
        for (uint i = 0; i < usersPos[_user].length; ++i) {
            userStrategies[i] = strategies[usersPos[_user][i]];
        }

        return userStrategies;
    }

    function getPaginatedStrategies(uint _page, uint _perPage) public view returns (Strategy[] memory) {
        Strategy[] memory strategiesPerPage = new Strategy[](_perPage);

        uint start = _page * _perPage;
        uint end = start + _perPage;

        end = (end > strategiesPerPage.length) ? strategiesPerPage.length : end;

        uint count = 0;
        for (uint i = start; i < end; i++) {
            strategiesPerPage[count] = strategies[i];
            count++;
        }

        return strategiesPerPage;
    }

    function getPaginatedTemplates(uint _page, uint _perPage) public view returns (Template[] memory) {
        Template[] memory templatesPerPage = new Template[](_perPage);

        uint start = _page * _perPage;
        uint end = start + _perPage;

        end = (end > templatesPerPage.length) ? templatesPerPage.length : end;

        uint count = 0;
        for (uint i = start; i < end; i++) {
            templatesPerPage[count] = templates[i];
            count++;
        }

        return templatesPerPage;
    }
}
