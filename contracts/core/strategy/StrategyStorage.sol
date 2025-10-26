// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IStrategyStorage } from "../../interfaces/core/IStrategyStorage.sol";
import { StrategyModel } from "./StrategyModel.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";

/// @title StrategyStorage - Record of all the Strategies created
contract StrategyStorage is StrategyModel, AdminAuth, IStrategyStorage {
    Strategy[] public strategies;
    bool public openToPublic = false;

    error NoAuthToCreateStrategy(address, bool);

    event StrategyCreated(uint256 indexed strategyId);

    modifier onlyAuthCreators() {
        if (adminVault.owner() != msg.sender && openToPublic == false) {
            revert NoAuthToCreateStrategy(msg.sender, openToPublic);
        }

        _;
    }

    /// @notice Creates a new strategy and writes the data in an array
    /// @dev Can only be called by auth addresses if it's not open to public
    /// @param _name Name of the strategy useful for logging what strategy is executing
    /// @param _triggerIds Array of identifiers for trigger - bytes4(keccak256(TriggerName))
    /// @param _actionIds Array of identifiers for actions - bytes4(keccak256(ActionName))
    /// @param _paramMapping Describes how inputs to functions are piped from return/subbed values
    /// @param _continuous If the action is repeated (continuos) or one time
    function createStrategy(
        string memory _name,
        bytes4[] memory _triggerIds,
        bytes4[] memory _actionIds,
        uint8[][] memory _paramMapping,
        bool _continuous
    ) public override onlyAuthCreators returns (uint256) {
        strategies.push(
            Strategy({
                name: _name,
                creator: msg.sender,
                triggerIds: _triggerIds,
                actionIds: _actionIds,
                paramMapping: _paramMapping,
                continuous: _continuous
            })
        );

        emit StrategyCreated(strategies.length - 1);

        return strategies.length - 1;
    }

    /// @notice Switch to determine if bundles can be created by anyone
    /// @dev Callable only by the owner
    /// @param _openToPublic Flag if true anyone can create bundles
    function changeEditPermission(bool _openToPublic) public override onlyOwner {
        openToPublic = _openToPublic;
    }

    ////////////////////////////// VIEW METHODS /////////////////////////////////

    function getStrategy(uint256 _strategyId) public view override returns (Strategy memory) {
        return strategies[_strategyId];
    }

    function getStrategyCount() public view override returns (uint256) {
        return strategies.length;
    }

    function getPaginatedStrategies(uint256 _page, uint256 _perPage) public view override returns (Strategy[] memory) {
        Strategy[] memory strategiesPerPage = new Strategy[](_perPage);

        uint256 start = _page * _perPage;
        uint256 end = start + _perPage;

        end = (end > strategies.length) ? strategies.length : end;

        uint256 count = 0;
        for (uint256 i = start; i < end; i++) {
            strategiesPerPage[count] = strategies[i];
            count++;
        }

        return strategiesPerPage;
    }
}
