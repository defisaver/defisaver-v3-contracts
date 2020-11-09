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
    function manageActions(
        string memory _name,
        bytes[][] memory _actionsCallData,
        bytes[][] memory _actionSubData,
        uint8[][] memory _paramMapping,
        bytes32[] memory _actionIds
    ) public payable {
        (uint256 flAmount, address flToken, uint8 flType) = checkFl(
            _actionIds[0],
            _actionsCallData[0]
        );

        address payable actionExecutorAddr = payable(registry.getAddr(keccak256("ActionExecutor")));
        bytes memory encodedActions = abi.encode(
            _actionsCallData,
            _actionSubData,
            _paramMapping,
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
            ActionExecutor.FlData memory flData = ActionExecutor.FlData({
                loanTokenAddr: address(0),
                loanAmount: 0,
                feeAmount: 0,
                flType: ActionExecutor.FlType.DYDX_LOAN
            });

            ActionExecutor(actionExecutorAddr).executeActions(
                _actionsCallData,
                _actionSubData,
                _paramMapping,
                _actionIds,
                address(this),
                flData
            );
        }

        removePermission(actionExecutorAddr);

        DefisaverLogger(DEFISAVER_LOGGER).Log(address(this), msg.sender, _name, "");
    }

    /// @notice Checks if the first action is a FL and gets it's data
    /// @param _actionId Id of first action
    /// @param _firstAction First action call data
    function checkFl(bytes32 _actionId, bytes[] memory _firstAction)
        internal
        returns (
            uint256,
            address,
            uint8
        )
    {
        address payable flActionAddr = payable(registry.getAddr(_actionId));

        if (IFLAction(flActionAddr).actionType() == 0) {
            // bytes memory flData = IFLAction(flActionAddr).executeAction(
            //     _actionId,
            //     _firstAction
            // );
            // (uint256 flAmount, address loanAddr, uint8 flType) = abi.decode(
            //     flData,
            //     (uint256, address, uint8)
            // );

            // return (flAmount, loanAddr, flType);
        }

        return (0, address(0), 0);
    }
}
