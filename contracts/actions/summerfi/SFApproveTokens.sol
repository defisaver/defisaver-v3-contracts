// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import {ActionBase} from "../ActionBase.sol";
import {IERC20} from "../../interfaces/IERC20.sol";
import {IDSProxy} from "../../interfaces/IDSProxy.sol";
import {IExecutable} from "../../interfaces/summerfi/IExecutable.sol";
import {IOperationsRegistry} from "../../interfaces/summerfi/IOperationsRegistry.sol";
import {IOperationExecutor, Call} from "../../interfaces/summerfi/IOperationExecutor.sol";


/// @title Approve tokens through Summerfi proxy
/// @dev DSProxy that calls this action needs to be permited by Summerfi proxy through AccountGuard
contract SFApproveTokens is ActionBase {
    address constant SF_OPERATION_EXECUTOR = 0xcA71C36D26f515AD0cce1D806B231CBC1185CdfC;
    address constant SF_OPERATIONS_REGISTRY = 0x563d2689fE89c78259dD7F694146BB93f6388A55;
    string constant SF_OPERATION_NAME = "AAVEV3PaybackWithdraw";
    bytes32 constant SF_OPERATION_HASH = keccak256(bytes(SF_OPERATION_NAME));
    bytes32 constant SF_SET_APPROVAL_HASH = keccak256("SetApproval_3");
    uint256 constant SF_OPERATION_ACTIONS = 9;
    uint256 constant OPERATION_SET_APPROVAL_INDEX = 1;

    error SFApproveFailed(address proxy, address sfProxy);
    error InvalidArrayLength();

    /// @param sfProxy  Summerfi proxy address
    /// @param spender  DSProxy address
    /// @param tokens  List of assets to approve
    /// @param allowances  Approve amounts
    struct Params {
        address sfProxy;
        address spender;
        address[] tokens;
        uint256[] allowances;
    }

    struct SFSetApprovalData {
        address asset;
        address delegate;
        uint256 amount;
        bool sumAmounts;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _sfApprove(params);
        emit ActionEvent("SFApproveTokens", logData);
        return bytes32(0);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _sfApprove(params);
        logger.logActionDirectEvent("SFApproveTokens", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _sfApprove(Params memory params) internal returns (bytes memory logData) {
        uint256 len = params.tokens.length;
        if (len != params.allowances.length) {
            revert InvalidArrayLength();
        }
        if (params.spender == address(0)) {
            params.spender = address(this);
        }

        (bytes32[] memory targets, ) = IOperationsRegistry(SF_OPERATIONS_REGISTRY).getOperation(
            SF_OPERATION_NAME
        );
        Call[] memory calls = new Call[](SF_OPERATION_ACTIONS);
        for (uint256 i; i < SF_OPERATION_ACTIONS; ++i) {
            calls[i] = Call({target: targets[i], data: new bytes(0), skip: true});
        }
        calls[OPERATION_SET_APPROVAL_INDEX].target = SF_SET_APPROVAL_HASH;
        calls[OPERATION_SET_APPROVAL_INDEX].skip = false;

        uint8[] memory emptyParamMap = new uint8[](3);

        for (uint256 i; i < len; ++i) {
            address tokenAddr = params.tokens[i];
            uint256 allowance = params.allowances[i];
            calls[OPERATION_SET_APPROVAL_INDEX].data = abi.encodeWithSelector(
                IExecutable.execute.selector,
                abi.encode(
                    SFSetApprovalData({
                        asset: tokenAddr,
                        delegate: params.spender,
                        amount: allowance,
                        sumAmounts: false
                    })
                ),
                emptyParamMap
            );

            _sfExecute(params.sfProxy, calls);

            uint256 actual = IERC20(tokenAddr).allowance(params.sfProxy, params.spender);
            if (actual < allowance && allowance != type(uint256).max) {
                revert SFApproveFailed(address(this), params.sfProxy);
            }
        }

        logData = abi.encode(params);
    }

    function _sfExecute(address sfProxy, Call[] memory calls) internal returns (bytes32) {
        return
            IDSProxy(sfProxy).execute(
                SF_OPERATION_EXECUTOR,
                abi.encodeWithSelector(
                    IOperationExecutor.executeOp.selector,
                    calls,
                    SF_OPERATION_NAME
                )
            );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
