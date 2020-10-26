// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../interfaces/IDSProxy.sol";
import "../interfaces/IWETH.sol";
import "./DFSRegistry.sol";
import "./Subscriptions.sol";
import "../interfaces/dydx/Account.sol";

import "../flashloan/FlashLoanReceiverBase.sol";

/// @title Executes a series of actions by calling the users DSProxy
contract ActionExecutor is FlashLoanReceiverBase {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    DFSRegistry public constant registry = DFSRegistry(0x2f111D6611D3a3d559992f39e3F05aC0385dCd5D);

    address public constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    ILendingPoolAddressesProvider
        public LENDING_POOL_ADDRESS_PROVIDER = ILendingPoolAddressesProvider(
        0x24a42fD28C976A61Df5D00D0599C34c4f90748c8
    );

    // solhint-disable-next-line no-empty-blocks
    constructor() FlashLoanReceiverBase(LENDING_POOL_ADDRESS_PROVIDER) {}

    enum FlType {NO_LOAN, AAVE_LOAN, DYDX_LOAN}

    /// @notice Executes a series of action through dsproxy
    /// @dev If first action is FL it's skipped
    /// @param _actions Array of actions (their callData)
    /// @param _actionIds Array of action ids
    /// @param _proxy DsProxy address of the user
    /// @param _loanTokenAddr Token address of the loaned token
    /// @param _loanAmount Loan amount
    /// @param _feeAmount Fee Loan amount
    /// @param _flType Type of Flash loan
    function executeActions(
        bytes[] memory _actions,
        uint256[] memory _actionIds,
        address _proxy,
        address _loanTokenAddr,
        uint256 _loanAmount,
        uint256 _feeAmount,
        FlType _flType
    ) public {
        bytes32[] memory responses = new bytes32[](_actions.length);
        uint256 i = 0;

        // Skip if FL and push first response as amount FL taken
        if (_flType != FlType.NO_LOAN) {
            i = 1;
            responses[0] = bytes32(_loanAmount);
        }

        Subscriptions sub = Subscriptions(registry.getAddr(keccak256("Subscriptions")));

        for (; i < _actions.length; ++i) {
            bytes32 id;

            if (_actionIds[i] != 0) {
                id = sub.getAction(_actionIds[i]).id;
            } else {
                (id, _actions[i]) = abi.decode(_actions[i], (bytes32, bytes));
            }

            responses[i] = IDSProxy(_proxy).execute{value: address(this).balance}(
                registry.getAddr(id),
                abi.encodeWithSignature(
                    "executeAction(uint256,bytes,bytes32[])",
                    _actionIds[i],
                    _actions[i],
                    responses
                )
            );
        }

        if (_flType == FlType.AAVE_LOAN) {
            transferFundsBackToPoolInternal(_loanTokenAddr, _loanAmount.add(_feeAmount));
        }

        if (_flType == FlType.DYDX_LOAN) {
            dydxPaybackLoan(_proxy, _loanTokenAddr, _loanAmount.add(_feeAmount));
        }
    }

    /// @notice Aave entry point, will be called if aave FL is taken
    function executeOperation(
        address _reserve,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _params
    ) external override {
        address proxy;
        bytes[] memory actions;
        uint256[] memory actionIds;

        (actions, actionIds, proxy, _reserve, _amount) = abi.decode(
            _params,
            (bytes[], uint256[], address, address, uint256)
        );
        executeActions(actions, actionIds, proxy, _reserve, _amount, _fee, FlType.AAVE_LOAN);
    }

    /// @notice  DyDx FL entry point, will be called if aave FL is taken
    function callFunction(
        address,
        Account.Info memory,
        bytes memory data
    ) public {
        (
            bytes[] memory actions,
            uint256[] memory actionIds,
            address proxy,
            address tokenAddr,
            uint256 amount
        ) = abi.decode(data, (bytes[], uint256[], address, address, uint256));

        if (tokenAddr == WETH_ADDRESS || tokenAddr == ETH_ADDRESS) {
            IWETH(WETH_ADDRESS).withdraw(amount);
        }

        executeActions(actions, actionIds, proxy, tokenAddr, amount, 0, FlType.DYDX_LOAN);
    }

    /// @notice Returns the FL amount for DyDx to the DsProxy
    function dydxPaybackLoan(
        address _proxy,
        address _loanTokenAddr,
        uint256 _amount
    ) internal {
        if (_loanTokenAddr == WETH_ADDRESS || _loanTokenAddr == ETH_ADDRESS) {
            IWETH(WETH_ADDRESS).deposit{value: _amount + 2}();
            IERC20(WETH_ADDRESS).safeTransfer(_proxy, _amount + 2);
        } else {
            IERC20(_loanTokenAddr).safeTransfer(_proxy, _amount);
        }
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable override(FlashLoanReceiverBase) {}
}
