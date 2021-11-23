// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "./StrategyModel.sol";
import "../../auth/AdminAuth.sol";

/// @title StrategyStorage - Record of all the Strategies created
contract StrategyStorage is StrategyModel, AdminAuth {

    ApprovedStrategy[] public strategies;
    bool public openToPublic = false;

    error NoAuthToCreateStrategy(address,bool);
    event StrategyCreated(uint256 indexed, address indexed, bytes32 indexed, Strategy);

    modifier onlyAuthCreators {
        if (adminVault.owner() != msg.sender && openToPublic == false) {
            revert NoAuthToCreateStrategy(msg.sender, openToPublic);
        }

        _;
    }

    function createStrategy(
        Strategy calldata _strategy
    ) public onlyAuthCreators returns (uint256) {
        require(msg.sender == _strategy.creator, "Creator not sender");

        bytes32 strategyHash = keccak256(abi.encode(_strategy));
        strategies.push(
            ApprovedStrategy({
                hashcheck: strategyHash
            })
        );

        uint256 currentId = strategies.length -1;
        emit StrategyCreated(currentId, msg.sender, strategyHash, _strategy);

        return currentId;
    }

    function changeEditPermission(bool _openToPublic) public onlyOwner {
        openToPublic = _openToPublic;
    }

    ////////////////////////////// VIEW METHODS /////////////////////////////////

    function getStrategy(uint _strategyId) public view returns (ApprovedStrategy memory) {
        return strategies[_strategyId];
    }
    function getStrategyCount() public view returns (uint256) {
        return strategies.length;
    }

    function getPaginatedStrategies(uint _page, uint _perPage) public view returns (ApprovedStrategy[] memory) {
        ApprovedStrategy[] memory strategiesPerPage = new ApprovedStrategy[](_perPage);

        uint start = _page * _perPage;
        uint end = start + _perPage;

        end = (end > strategies.length) ? strategies.length : end;

        uint count = 0;
        for (uint i = start; i < end; i++) {
            strategiesPerPage[count] = strategies[i];
            count++;
        }

        return strategiesPerPage;
    }
    // editing a strategy?
}