// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../interfaces/ILendingPool.sol";
import "../auth/ProxyPermission.sol";
import "../interfaces/IFLAction.sol";
import "../core/DFSRegistry.sol";
import "./Subscriptions.sol";
import "../utils/GasBurner.sol";

import "hardhat/console.sol";

/// @title Handle FL taking and calls action executor
contract TaskExecutor is StrategyData, GasBurner, ProxyPermission {
    address public constant DEFISAVER_LOGGER = 0x5c55B921f590a89C1Ebe84dF170E655a82b62126;

    address public constant REGISTRY_ADDR = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    bytes32 constant ACTION_EXECUTOR_ID = keccak256("ActionExecutor");
    bytes32 constant SUBSCRIPTION_ID = keccak256("Subscriptions");

    /// @notice Called directly through Dsproxy to execute a task
    function executeTask(Task memory currTask) public payable burnGas {
        _executeActions(currTask);
    }

    function executeStrategyTask(uint256 _strategyId, bytes[][] memory _actionCallData)
        public
        payable
    {
        address subAddr = registry.getAddr(SUBSCRIPTION_ID);
        Strategy memory strategy = Subscriptions(subAddr).getStrategy(_strategyId);
        Template memory template = Subscriptions(subAddr).getTemplate(strategy.templateId);

        Task memory currTask = Task({
            name: template.name,
            callData: _actionCallData,
            subData: strategy.actionData,
            ids: template.actionIds,
            paramMapping: template.paramMapping
        });

        _executeActions(currTask);
    }

    function _executeActionsFromFL(Task memory _currTask, bytes32 _flAmount) public payable {
        bytes32[] memory returnValues = new bytes32[](_currTask.ids.length);
        returnValues[0] = _flAmount;

        for (uint256 i = 1; i < _currTask.ids.length; ++i) {
            returnValues[i] = _executeAction(_currTask, i, returnValues);
        }
    }

    function _executeActions(Task memory _currTask) internal {
        address firstActionAddr = registry.getAddr(_currTask.ids[0]);

        bytes32[] memory returnValues = new bytes32[](_currTask.ids.length);

        if (isFL(firstActionAddr)) {
            _parseFL(_currTask, firstActionAddr, returnValues);
        } else {
            for (uint256 i = 0; i < _currTask.ids.length; ++i) {
                console.log(i);
                returnValues[i] = _executeAction(_currTask, i, returnValues);
            }
        }

        DefisaverLogger(DEFISAVER_LOGGER).Log(address(this), msg.sender, _currTask.name, "");
    }

    function _parseFL(
        Task memory _currTask,
        address _firstActionAddr,
        bytes32[] memory _returnValues
    ) internal {
        givePermission(_firstActionAddr);

        bytes memory actionExecutorData = abi.encode(_currTask, address(this));

        _currTask.callData[0][_currTask.callData[0].length - 1] = actionExecutorData;

        _executeAction(_currTask, 0, _returnValues);

        removePermission(_firstActionAddr);
    }

    function _executeAction(
        Task memory _currTask,
        uint256 _index,
        bytes32[] memory _returnValues
    ) internal returns (bytes32 response) {
        console.log("ODJE %s", registry.getAddr(_currTask.ids[_index]));
        response = IDSProxy(address(this)).execute{value: address(this).balance}(
            registry.getAddr(_currTask.ids[_index]),
            abi.encodeWithSignature(
                "executeAction(bytes[],bytes[],uint8[],bytes32[])",
                _currTask.callData[_index],
                _currTask.subData[_index],
                _currTask.paramMapping[_index],
                _returnValues
            )
        );
    }

    function isFL(address _actionAddr) internal returns (bool) {
        return IFLAction(_actionAddr).actionType() == uint8(IFLAction.ActionType.FL_ACTION);
    }
}
