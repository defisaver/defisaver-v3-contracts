// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../ActionBase.sol";
import "../../../utils/ReentrancyGuard.sol";
import "../../../interfaces/flashloan/IERC3156FlashBorrower.sol";
import "../../../interfaces/flashloan/IERC3156FlashLender.sol";

import "../../../core/StrategyData.sol";
import "../../../interfaces/IDSProxy.sol";
import "../../../interfaces/IFLParamGetter.sol";

import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";

contract FLMaker is ActionBase, StrategyData, ReentrancyGuard, IERC3156FlashBorrower {
    using TokenUtils for address;
    using SafeMath for uint256;

    address public constant DSS_FLASH_ADDR = 0x1EB4CF3A948E7D72A198fe073cCb8C7a948cD853;
    address public constant DAI_ADDR = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    /// @dev Function sig of TaskExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR = 0xd6741b9e;
    bytes32 constant TASK_EXECUTOR_ID = keccak256("TaskExecutor");

    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    struct Params {
        uint256 amount;
        address flParamGetterAddr;
        bytes flParamGetterData;
    }

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        Params memory params = parseInputs(_callData);

        if (params.flParamGetterAddr != address(0)) {
            (, uint256[] memory amounts,) =
                IFLParamGetter(params.flParamGetterAddr).getFlashLoanParams(params.flParamGetterData);

            params.amount = amounts[0];
        }
        bytes memory taskData = _callData[_callData.length - 1];

        uint256 amount = _flMaker(params.amount, taskData);
        return bytes32(amount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    function _flMaker(uint256 _amount, bytes memory _taskData) internal returns (uint256) {
        IERC3156FlashLender(DSS_FLASH_ADDR).flashLoan(
            IERC3156FlashBorrower(address(this)),
            DAI_ADDR,
            _amount,
            _taskData
        );

        logger.Log(
            address(this),
            msg.sender,
            "FLMaker",
            abi.encode(
                _amount
            )
        );

        return _amount;
    }

    function onFlashLoan(
        address _initiator,
        address _token,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _data
    ) external override nonReentrant returns (bytes32) {
        require(msg.sender == address(DSS_FLASH_ADDR), "Untrusted lender");
        require(_initiator == address(this), "Untrusted loan initiator");

        (Task memory currTask, address proxy) = abi.decode(_data, (Task, address));
        _token.withdrawTokens(proxy, _amount);

        address payable taskExecutor = payable(registry.getAddr(TASK_EXECUTOR_ID));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            taskExecutor,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currTask, _amount)
        );

        uint256 paybackAmount = _amount.add(_fee);
        require(_token.getBalance(address(this)) == paybackAmount, "Wrong payback amount");

        _token.approveToken(DSS_FLASH_ADDR, paybackAmount);
        return CALLBACK_SUCCESS;
    }

    function parseInputs(bytes[] memory _callData)
        public
        pure
        returns (Params memory params)
    {
        params = abi.decode(_callData[0], (Params));
    }
}