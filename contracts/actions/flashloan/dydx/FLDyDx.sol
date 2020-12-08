// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../ActionBase.sol";
import "../../../core/Subscriptions.sol";
import "../../../interfaces/ILendingPool.sol";
import "../../../interfaces/IWETH.sol";
import "../../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../../core/StrategyData.sol";

import "./DydxFlashLoanBase.sol";

contract FLDyDx is ActionBase, StrategyData, DydxFlashLoanBase {
    using SafeERC20 for IERC20;

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    bytes4 public constant CALLBACK_SELECTOR = 0xd6741b9e;
                                               

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

        address payable receiver = payable(registry.getAddr(keccak256("FLDyDx")));

        dydxFlashLoan(receiver, token, amount, abi.encode(_callData[2], amount, token));

        logger.Log(address(this), msg.sender, "FLDyDx", abi.encode(amount, token));

        return bytes32(amount);
    }

    function callFunction(
        address,
        Account.Info memory,
        bytes memory _data
    ) public {
        (bytes memory callData, uint256 amount, address tokenAddr) = abi.decode(
            _data,
            (bytes, uint256, address));
            
        (Task memory currTask, address proxy) = abi.decode(callData, (Task, address));

        if (tokenAddr == WETH_ADDRESS || tokenAddr == ETH_ADDRESS) {
            IWETH(WETH_ADDRESS).withdraw(amount);
        }

        sendTokens(tokenAddr, proxy, amount);

        address payable taskExecutor = payable(registry.getAddr(keccak256("TaskExecutor")));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            taskExecutor,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currTask, amount)
        );

        // return FL
        dydxPaybackLoan(proxy, tokenAddr, (amount + 2));
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

    function dydxFlashLoan(
        address payable _receiver,
        address _token,
        uint256 _amount,
        bytes memory _data
    ) internal {
        if (_token == ETH_ADDRESS) {
            _token = WETH_ADDRESS;
        }

        ISoloMargin solo = ISoloMargin(SOLO_MARGIN_ADDRESS);

        // Get marketId from token address
        uint256 marketId = _getMarketIdFromTokenAddress(SOLO_MARGIN_ADDRESS, _token);

        uint256 repayAmount = _getRepaymentAmountInternal(_amount);

        IERC20(_token).safeApprove(SOLO_MARGIN_ADDRESS, 0);
        IERC20(_token).safeApprove(SOLO_MARGIN_ADDRESS, repayAmount);

        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, _amount, _receiver);
        operations[1] = _getCallAction(_data, _receiver);
        operations[2] = _getDepositAction(marketId, repayAmount, address(this));

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    function parseParamData(bytes memory _data)
        public
        pure
        returns (
            uint256 amount,
            address token,
            uint8 flType
        )
    {
        (amount, token, flType) = abi.decode(_data, (uint256, address, uint8));
    }

    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
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

    receive() external payable {}
}
