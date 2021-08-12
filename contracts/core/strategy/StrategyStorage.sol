// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "./StrategyModel.sol";
import "../../auth/AdminAuth.sol";

/// @title StrategyStorage - Record of all the Strategies created
contract StrategyStorage is StrategyModel, AdminAuth {

    Strategy[] public strategies;
    bool public openToPublic = false;

    error NoAuthToCreateStrategy(address,bool);
    event StrategyCreated(uint256);

    modifier onlyAuthCreators {
        if (adminVault.owner() != msg.sender && openToPublic == false) {
            revert NoAuthToCreateStrategy(msg.sender, openToPublic);
        }

        _;
    }

    // TODO: REMOVE ONLY USED FOR TESTING
    constructor() {
        openToPublic = true;
    }

    function createStrategy(
        string memory _name,
        bytes4[] memory _triggerIds,
        bytes4[] memory _actionIds,
        uint8[][] memory _paramMapping
    ) public onlyAuthCreators returns (uint256) {
        strategies.push(
            Strategy({
                name: _name,
                creator: msg.sender,
                triggerIds: _triggerIds,
                actionIds: _actionIds,
                paramMapping: _paramMapping
            })
        );

        emit StrategyCreated(strategies.length - 1);

        return strategies.length - 1;
    }

    function changeEditPermission(bool _openToPublic) public onlyOwner {
        openToPublic = _openToPublic;
    }

    ////////////////////////////// VIEW METHODS /////////////////////////////////

    function getStrategy(uint _strategyId) public view returns (Strategy memory) {
        return strategies[_strategyId];
    }
    function getStrategyCount() public view returns (uint256) {
        return strategies.length;
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

}