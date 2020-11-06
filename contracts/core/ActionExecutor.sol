// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../auth/AdminAuth.sol";
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

    address public constant REGISTRY_ADDR = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    address public constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    ILendingPoolAddressesProvider
        public LENDING_POOL_ADDRESS_PROVIDER = ILendingPoolAddressesProvider(
        0x24a42fD28C976A61Df5D00D0599C34c4f90748c8
    );

    struct FlData {
        address loanTokenAddr;
        uint256 loanAmount;
        uint256 feeAmount;
        FlType flType;
    }

    // solhint-disable-next-line no-empty-blocks
    constructor() FlashLoanReceiverBase(LENDING_POOL_ADDRESS_PROVIDER) {}

    enum FlType {NO_LOAN, AAVE_LOAN, DYDX_LOAN}

    /// @notice Executes a series of action through dsproxy
    /// @dev If first action is FL it's skipped
    /// @param _actionsCallData Array of user send data for the actions
    /// @param _actionSubData Array of subscribed data for the actions
    /// @param _paramMapping Array of param mappings
    /// @param _actionIds Array of actions ids, action names
    /// @param _proxy DsProxy address of the user
    function executeActions(
        bytes[][] memory _actionsCallData,
        bytes[][] memory _actionSubData,
        uint8[][] memory _paramMapping,
        bytes32[] memory _actionIds,
        address _proxy,
        FlData memory _flData
    ) public {
        bytes32[] memory returnValues = new bytes32[](_actionIds.length);
        uint256 i = 0;

        // Skip if FL and push first response as amount FL taken
        if (_flData.flType != FlType.NO_LOAN) {
            i = 1;
            returnValues[0] = bytes32(_flData.loanAmount);
        }

        Subscriptions sub = Subscriptions(registry.getAddr(keccak256("Subscriptions")));

        for (; i < _actionIds.length; ++i) {
            returnValues[i] = IDSProxy(_proxy).execute{value: address(this).balance}(
                registry.getAddr(_actionIds[i]),
                abi.encodeWithSignature(
                    "executeAction(bytes[],bytes[],uint8[],bytes32[])",
                    _actionsCallData[i],
                    _actionSubData[i],
                    _paramMapping[i],
                    returnValues
                )
            );
        }

        if (_flData.flType == FlType.AAVE_LOAN) {
            transferFundsBackToPoolInternal(_flData.loanTokenAddr, _flData.loanAmount.add(_flData.feeAmount));
        }

        if (_flData.flType == FlType.DYDX_LOAN) {
            dydxPaybackLoan(_proxy, _flData.loanTokenAddr, _flData.loanAmount.add(_flData.feeAmount));
        }
    }

    /// @notice Aave entry point, will be called if aave FL is taken
    function executeOperation(
        address,
        uint256,
        uint256 _fee,
        bytes calldata _params
    ) external override {
        
        (
            bytes[][] memory actionsCallData,
            bytes[][] memory actionSubData,
            uint8[][] memory paramMapping,
            bytes32[] memory actionIds,
            address proxy,
            address tokenAddr,
            uint256 amount
        ) = abi.decode(_params, (bytes[][], bytes[][], uint8[][], bytes32[], address, address, uint256));

        FlData memory flData = FlData({
            loanTokenAddr: tokenAddr,
            loanAmount: amount,
            feeAmount: _fee,
            flType: FlType.AAVE_LOAN
        });

        executeActions(actionsCallData, actionSubData, paramMapping, actionIds, proxy, flData);
    }

    /// @notice  DyDx FL entry point, will be called if aave FL is taken
    function callFunction(
        address,
        Account.Info memory,
        bytes memory data
    ) public {
        (
            bytes[][] memory actionsCallData,
            bytes[][] memory actionSubData,
            uint8[][] memory paramMapping,
            bytes32[] memory actionIds,
            address proxy,
            address tokenAddr,
            uint256 amount
        ) = abi.decode(data, (bytes[][], bytes[][], uint8[][], bytes32[], address, address, uint256));

        FlData memory flData = FlData({
            loanTokenAddr: tokenAddr,
            loanAmount: amount,
            feeAmount: 0,
            flType: FlType.DYDX_LOAN
        });

        if (tokenAddr == WETH_ADDRESS || tokenAddr == ETH_ADDRESS) {
            IWETH(WETH_ADDRESS).withdraw(amount);
        }

        executeActions(actionsCallData, actionSubData, paramMapping, actionIds, proxy, flData);
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
