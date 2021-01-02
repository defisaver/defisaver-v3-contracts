// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../core/Subscriptions.sol";
import "../../interfaces/ILendingPool.sol";
import "../../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import "../../interfaces/aaveV2/ILendingPoolV2.sol";
import "../../interfaces/aaveV2/IFlashLoanParamsGetter.sol";
import "../../core/StrategyData.sol";
import "../../utils/TokenUtils.sol";

/// @title Action that gets and receives a FL from Aave V2
contract FLCustomAaveV2 is ActionBase, StrategyData, TokenUtils {
    using SafeERC20 for IERC20;

    address
        public constant AAVE_LENDING_POOL = 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9;

    ILendingPoolAddressesProviderV2
        public constant addressesProvider = ILendingPoolAddressesProviderV2(
        0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    );

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint16 public constant AAVE_REFERRAL_CODE = 64;

    bytes4 public constant CALLBACK_SELECTOR = 0xd6741b9e;

    bytes32 constant FL_AAVE_ID = keccak256("FLCustomAaveV2");
    bytes32 constant TASK_EXECUTOR_ID = keccak256("TaskExecutor");

    struct FLAaveV2Data {
        address receiver;
        address[] tokens;
        uint256[] amounts;
        uint256[] modes;
        address onBehalfOf;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        (address viewerAddress, address onBehalfOf, address receiver, bytes memory flashLoanGetterData) = parseInputs(_callData);
        
        (address[] memory tokens, uint256[] memory amounts, uint256[] memory modes) = IFlashLoanParamsGetter(viewerAddress).getFlashLoanParams(flashLoanGetterData);
        
        FLAaveV2Data memory flData = FLAaveV2Data({
            receiver: receiver,
            tokens: tokens, 
            amounts: amounts,
            modes: modes,
            onBehalfOf: onBehalfOf
        });

        uint flAmount = _flAaveV2(flData, _callData[3]);

        return bytes32(flAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _flAaveV2(FLAaveV2Data memory _flData, bytes memory _params) internal returns (uint) {
        ILendingPoolV2(AAVE_LENDING_POOL).flashLoan(
            _flData.receiver,
            _flData.tokens,
            _flData.amounts,
            _flData.modes,
            _flData.onBehalfOf,
            _params,
            AAVE_REFERRAL_CODE
        );

        logger.Log(
            address(this),
            msg.sender,
            "FLAaveV2",
            abi.encode(_flData.tokens, _flData.amounts, _flData.modes, _flData.onBehalfOf)
        );

        return _flData.amounts[0];
    }

    /// @notice Aave callback function that formats and calls back TaskExecutor
    function executeOperation(
        address[] memory _assets,
        uint256[] memory _amounts,
        uint256[] memory _fees,
        address,
        bytes memory _params
    ) public returns (bool) {
        (Task memory currTask, address proxy) = abi.decode(_params, (Task, address));
        for (uint256 i = 0; i < _assets.length; ++i) {
            if (_assets[i] == WETH_ADDR) {
                withdrawWeth(_amounts[i]);
            }

            withdrawTokens(convertToEth(_assets[i]), proxy, _amounts[i]);
        }

        address payable taskExecutor = payable(registry.getAddr(TASK_EXECUTOR_ID));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            taskExecutor,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currTask, bytes32(_amounts[0] + _fees[0]))
        );

        // return FL
        for (uint256 i = 0; i < _assets.length; i++) {
            convertAndDepositToWeth(convertToEth(_assets[i]), (_amounts[i] + _fees[i]));
            approveToken(_assets[i], address(AAVE_LENDING_POOL), _amounts[i] + _fees[i]);
        }

        return true;
    }

    function parseInputs(bytes[] memory _callData)
        public
        view
        returns (address viewer, address onBehalfOf, address receiver, bytes memory flashLoanGetterData)
    {
        viewer = abi.decode(_callData[0], (address));
        onBehalfOf = abi.decode(_callData[1], (address));
        flashLoanGetterData = abi.decode(_callData[2], (bytes));
        receiver = payable(registry.getAddr(FL_AAVE_ID));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
