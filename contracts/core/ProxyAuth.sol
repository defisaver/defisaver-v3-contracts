// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../interfaces/IDFSRegistry.sol";
import "../interfaces/IDSProxy.sol";
import "../auth/AdminAuth.sol";

/// @title ProxyAuth Gets DSProxy auth from users and is callable by the Executor
contract ProxyAuth is AdminAuth {

    address public constant REGISTRY_ADDR = 0xB0e1682D17A96E8551191c089673346dF7e1D467;
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    bytes32 constant STRATEGY_EXECUTOR_ID = keccak256("StrategyExecutor");
    string public constant ERR_SENDER_NOT_EXECUTOR = "Sender not executor addr";

    modifier onlyExecutor {
        address executorAddr = registry.getAddr(STRATEGY_EXECUTOR_ID);
        require(msg.sender == executorAddr, ERR_SENDER_NOT_EXECUTOR);
        _;
    }

    /// @notice Calls the .execute() method of the specified users DSProxy
    /// @dev Contract gets the authority from the user to call it, only callable by Executor
    /// @param _proxyAddr Address of the users DSProxy
    /// @param _contractAddr Address of the contract which to execute
    /// @param _data Call data of the function to be called
    function callExecute(
        address _proxyAddr,
        address _contractAddr,
        bytes memory _data
    ) public payable onlyExecutor {

        IDSProxy(_proxyAddr).execute{value: msg.value}(_contractAddr, _data);

        // return if anything left
        if (address(this).balance > 0) {
            msg.sender.transfer(address(this).balance);
        }
    }

}