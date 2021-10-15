// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../balancer/helpers/BalancerV2Helper.sol";
import "../ActionBase.sol";
import "../../core/StrategyData.sol";

import "../../interfaces/balancer/IFlashLoanRecipient.sol";
import "../../interfaces/balancer/IFlashLoans.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/IFLParamGetter.sol";

import "../../utils/TokenUtils.sol";
import "../../utils/SafeMath.sol";
import "../../utils/ReentrancyGuard.sol";

contract FLBalancer is ActionBase, ReentrancyGuard, IFlashLoanRecipient, BalancerV2Helper {
    using TokenUtils for address;
    using SafeMath for uint256;

    /// @dev Function sig of TaskExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR = 0xd6741b9e;
    bytes32 constant TASK_EXECUTOR_ID = keccak256("TaskExecutor");

    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    struct Params {
        address[] tokens;           // Tokens to flash borrow
        uint256[] amounts;          // Token amounts
        address flParamGetterAddr;  // On-chain contract used for piping FL action parameters 
        bytes flParamGetterData;    // Data to supply to flParamGetter
    }

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        Params memory params = parseInputs(_callData);

        if (params.flParamGetterAddr != address(0)) {
            (params.tokens, params.amounts,) =
                IFLParamGetter(params.flParamGetterAddr).getFlashLoanParams(params.flParamGetterData);
        }

        bytes memory taskData = _callData[_callData.length - 1];

        uint256 amount = _flBalancer(params, taskData);
        return bytes32(amount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    /// @notice Gets a FL from Balancer and returns back the execution to the action address
    function _flBalancer(Params memory _params, bytes memory _taskData) internal returns (uint256) {
        IFlashLoans(VAULT_ADDR).flashLoan(
            address(this),
            _params.tokens,
            _params.amounts,
            _taskData
        );

        logger.Log(
            address(this),
            msg.sender,
            "FLBalancer",
            abi.encode(
                _params
            )
        );

        return _params.amounts[0];
    }

    /// @notice Balancer FL callback function that formats and calls back TaskExecutor
    function receiveFlashLoan(
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _feeAmounts,
        bytes memory _userData
    ) external override nonReentrant {
        require(msg.sender == VAULT_ADDR, "Untrusted lender");
        (StrategyData.Task memory currTask, address proxy) = abi.decode(_userData, (StrategyData.Task, address));

        for (uint256 i = 0; i < _tokens.length; i++) {
            _tokens[i].withdrawTokens(proxy, _amounts[i]);
        }
        address payable taskExecutor = payable(registry.getAddr(TASK_EXECUTOR_ID));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            taskExecutor,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currTask, _amounts[0].add(_feeAmounts[0]))
        );

        for (uint256 i = 0; i < _tokens.length; i++) {
            uint256 paybackAmount = _amounts[i].add(_feeAmounts[i]);
            
            require(_tokens[i].getBalance(address(this)) == paybackAmount, "Wrong payback amount");

            _tokens[i].withdrawTokens(address(VAULT_ADDR), paybackAmount);
        }
    }

    function parseInputs(bytes[] memory _callData)
        public
        pure
        returns (Params memory params)
    {
        params = abi.decode(_callData[0], (Params));
    }
}