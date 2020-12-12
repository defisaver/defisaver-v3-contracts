// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../../core/Subscriptions.sol";
import "../../../interfaces/ILendingPool.sol";
import "../../../interfaces/IWETH.sol";
import "../../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../../core/StrategyData.sol";
import "../../ActionBase.sol";
import "./DydxFlashLoanBase.sol";

/// @title Action that gets and receives a FL from DyDx protocol
contract FLDyDx is ActionBase, StrategyData, DydxFlashLoanBase {
    using SafeERC20 for IERC20;

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    bytes4 public constant CALLBACK_SELECTOR = 0xd6741b9e;

    bytes32 constant FL_DYDX_ID = keccak256("FLDyDx");
    bytes32 constant TASK_EXECUTOR_ID = keccak256("TaskExecutor");

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public override payable returns (bytes32) {
        uint256 amount = abi.decode(_callData[0], (uint256));
        address token = abi.decode(_callData[1], (address));

        amount = _parseParamUint(amount, _paramMapping[0], _subData, _returnValues);
        token = _parseParamAddr(token, _paramMapping[1], _subData, _returnValues);

        uint flAmount = _flDyDx(token, amount, abi.encode(_callData[2], amount, token));

        return bytes32(flAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Dydx callback function that formats and calls back TaskExecutor
    function callFunction(
        address,
        Account.Info memory,
        bytes memory _data
    ) public {
        (bytes memory callData, uint256 amount, address tokenAddr) = abi.decode(
            _data,
            (bytes, uint256, address)
        );

        (Task memory currTask, address proxy) = abi.decode(callData, (Task, address));

        if (tokenAddr == WETH_ADDRESS || tokenAddr == ETH_ADDRESS) {
            IWETH(WETH_ADDRESS).withdraw(amount);
        }

        sendTokens(tokenAddr, proxy, amount);

        address payable taskExecutor = payable(registry.getAddr(TASK_EXECUTOR_ID));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            taskExecutor,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currTask, amount)
        );

        // return FL
        dydxPaybackLoan(proxy, tokenAddr, (amount + 2));
    }

    function _flDyDx(
        address _token,
        uint256 _amount,
        bytes memory _data
    ) internal returns (uint) {
        if (_token == ETH_ADDRESS) {
            _token = WETH_ADDRESS;
        }

        address payable receiver = payable(registry.getAddr(FL_DYDX_ID));

        ISoloMargin solo = ISoloMargin(SOLO_MARGIN_ADDRESS);

        // Get marketId from token address
        uint256 marketId = _getMarketIdFromTokenAddress(SOLO_MARGIN_ADDRESS, _token);

        uint256 repayAmount = _getRepaymentAmountInternal(_amount);

        IERC20(_token).safeApprove(SOLO_MARGIN_ADDRESS, 0);
        IERC20(_token).safeApprove(SOLO_MARGIN_ADDRESS, repayAmount);

        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, _amount, receiver);
        operations[1] = _getCallAction(_data, receiver);
        operations[2] = _getDepositAction(marketId, repayAmount, address(this));

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);

        logger.Log(address(this), msg.sender, "FLDyDx", abi.encode(_amount, _token));

        return _amount;
    }

    function dydxPaybackLoan(
        address _proxy,
        address _loanTokenAddr,
        uint256 _amount
    ) internal {
        if (_loanTokenAddr == WETH_ADDRESS || _loanTokenAddr == ETH_ADDRESS) {
            IWETH(WETH_ADDRESS).deposit{value: _amount}();
            IERC20(WETH_ADDRESS).safeTransfer(_proxy, _amount);
        } else {
            IERC20(_loanTokenAddr).safeTransfer(_proxy, _amount);
        }
    }

    function sendTokens(
        address _token,
        address _to,
        uint256 _amount
    ) internal {
        if (_token != ETH_ADDRESS) {
            IERC20(_token).safeTransfer(_to, _amount);
        } else {
            payable(_to).transfer(_amount);
        }
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
