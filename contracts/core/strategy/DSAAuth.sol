// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IDFSRegistry } from "../../interfaces/IDFSRegistry.sol";
import { IAuth } from "../../interfaces/IAuth.sol";
import { IInstaAccountV2 } from "../../interfaces/insta/IInstaAccountV2.sol";
import { Pausable } from "../../auth/Pausable.sol";
import { CoreHelper } from "./../helpers/CoreHelper.sol";

/// @title DSAAuth Gets DSA Proxy Auth from users and is callable by the Executor
contract DSAAuth is Pausable, CoreHelper, IAuth {
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// @dev The id is on purpose not the same as contract name for easier deployment
    bytes4 constant STRATEGY_EXECUTOR_ID = bytes4(keccak256("StrategyExecutorID"));

    /// @dev Used for DSA Proxy Accounts
    string private constant DEFISAVER_CONNECTOR_NAME = "DefiSaverConnector";

    error SenderNotExecutorError(address, address);

    modifier onlyExecutor {
        address executorAddr = registry.getAddr(STRATEGY_EXECUTOR_ID);

        if (msg.sender != executorAddr){
            revert SenderNotExecutorError(msg.sender, executorAddr);
        }

        _;
    }

    /// @notice Calls the .cast() method of the specified users DSA Proxy
    /// @dev Contract gets the authority from the user to call it, only callable by Executor
    /// @dev All calls will be forwarded to RecipeExecutor. See DefiSaverConnector.
    /// @param _dsaProxyAddr Address of the users DSA Proxy
    /// @param _callData Call data of the function to be called
    function callExecute(
        address _dsaProxyAddr,
        address /* _contractAddr */,
        bytes memory _callData
    ) public payable onlyExecutor notPaused {
        string[] memory connectors = new string[](1);
        connectors[0] = DEFISAVER_CONNECTOR_NAME;

        bytes[] memory connectorsData = new bytes[](1);
        connectorsData[0] = _callData;

        // Origin will only be used for event logging, so here we will set it to the executor
        address origin = msg.sender;

        IInstaAccountV2(_dsaProxyAddr).cast{value: msg.value}(connectors, connectorsData, origin);
    }
}