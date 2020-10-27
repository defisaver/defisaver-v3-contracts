// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../interfaces/ILendingPool.sol";
import "../auth/ProxyPermission.sol";
import "../interfaces/IFLAction.sol";
import "../flashloan/GeneralizedFLTaker.sol";
import "../core/DFSRegistry.sol";
import "./Subscriptions.sol";
import "./ActionExecutor.sol";

/// @title Handle FL taking and calls action executor
contract ActionManager is GeneralizedFLTaker, ProxyPermission {
    address public constant DEFISAVER_LOGGER = 0x5c55B921f590a89C1Ebe84dF170E655a82b62126;

    address public constant REGISTRY_ADDR = 0x5FbDB2315678afecb367f032d93F642f64180aa3;

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    /// @notice Checks and takes flash loan and calls Action Executor
    /// @param _actionIds All of the actionIds for the strategy
    /// @param _actionsCallData All input data needed to execute actions
    function manageActions(
        string memory _name,
        uint256[] memory _actionIds,
        bytes[] memory _actionsCallData
    ) public payable {
        (uint256 flAmount, address flToken, uint8 flType) = checkFl(
            _actionIds[0],
            _actionsCallData[0]
        );

        address payable actionExecutorAddr = payable(registry.getAddr(keccak256("ActionExecutor")));
        bytes memory encodedActions = abi.encode(
            _actionsCallData,
            _actionIds,
            address(this),
            flToken,
            flAmount
        );

        givePermission(actionExecutorAddr);

        actionExecutorAddr.transfer(msg.value);

        if (flType != 0) {
            takeLoan(actionExecutorAddr, flToken, flAmount, encodedActions, LoanType(flType));
        } else {
            ActionExecutor(actionExecutorAddr).executeActions(
                _actionsCallData,
                _actionIds,
                address(this),
                address(0),
                0,
                0,
                ActionExecutor.FlType(0)
            );
        }

        removePermission(actionExecutorAddr);

        DefisaverLogger(DEFISAVER_LOGGER).Log(address(this), msg.sender, _name, "");
    }

    /// @notice Checks if the first action is a FL and gets it's data
    /// @param _actionId Id of first action
    /// @param _firstAction First action call data
    function checkFl(uint256 _actionId, bytes memory _firstAction)
        internal
        returns (
            uint256,
            address,
            uint8
        )
    {
        Subscriptions sub = Subscriptions(registry.getAddr(keccak256("Subscriptions")));
        bytes32 id;

        if (_actionId != 0) {
            id = sub.getAction(_actionId).id;
        } else {
            (id, _firstAction) = abi.decode(_firstAction, (bytes32, bytes));
        }

        address payable actionExecutorAddr = payable(registry.getAddr(id));

        if (IFLAction(actionExecutorAddr).actionType() == 0) {
            bytes memory flData = IFLAction(actionExecutorAddr).executeAction(
                _actionId,
                _firstAction
            );
            (uint256 flAmount, address loanAddr, uint8 flType) = abi.decode(
                flData,
                (uint256, address, uint8)
            );

            return (flAmount, loanAddr, flType);
        }

        return (0, address(0), 0);
    }
}
