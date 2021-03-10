// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../core/Subscriptions.sol";
import "../../interfaces/IFLParamGetter.sol";
import "../../interfaces/ILendingPool.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../core/StrategyData.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Action that gets and receives a FL from Aave V1
contract FLAave is ActionBase, StrategyData {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    string constant ERR_ONLY_AAVE_CALLER = "Caller not aave pool";
    string constant ERR_ETH_FL_PAYBACK = "Error while repaying fl in eth";

    address public constant AAVE_LENDING_POOL_ADDRESSES =
        0x398eC7346DcD622eDc5ae82352F02bE94C62d119;

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    bytes4 public constant CALLBACK_SELECTOR = 0xd6741b9e;

    ILendingPoolAddressesProvider public constant addressesProvider =
        ILendingPoolAddressesProvider(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8);

    bytes32 constant FL_AAVE_ID = keccak256("FLAave");
    bytes32 constant TASK_EXECUTOR_ID = keccak256("TaskExecutor");

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable override returns (bytes32) {
        (uint256 amount, address token, address flParamGetterAddr, bytes memory flParamGetterData) =
            parseInputs(_callData);

        // if we want to get on chain info about FL params
        if (flParamGetterAddr != address(0)) {
            (address[] memory tokens, uint256[] memory amounts, ) =
                IFLParamGetter(flParamGetterAddr).getFlashLoanParams(flParamGetterData);

            amount = amounts[0];
            token = tokens[0];
        }

        bytes memory taskData = _callData[_callData.length - 1];
        uint256 flAmount = _flAave(amount, token, taskData);

        return bytes32(flAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Gets a Fl from AaveV1 and returns back the execution to the action address
    /// @param _amount Amount of tokens to FL
    /// @param _tokenAddr Token address we want to FL
    /// @param _taskData Rest of the data we have in the task
    function _flAave(
        uint256 _amount,
        address _tokenAddr,
        bytes memory _taskData
    ) internal returns (uint256) {
        address payable receiver = payable(registry.getAddr(FL_AAVE_ID));

        ILendingPool(AAVE_LENDING_POOL_ADDRESSES).flashLoan(
            receiver,
            _tokenAddr,
            _amount,
            _taskData
        );

        logger.Log(address(this), msg.sender, "FLAave", abi.encode(_amount, _tokenAddr));

        return _amount;
    }

    /// @notice Aave callback function that formats and calls back TaskExecutor
    /// @dev There is no sender/initiator data in AaveV1 so we can't check if this is called from FL
    function executeOperation(
        address _reserve,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _params
    ) external {
        require(msg.sender == AAVE_LENDING_POOL_ADDRESSES, ERR_ONLY_AAVE_CALLER);

        (Task memory currTask, address proxy) = abi.decode(_params, (Task, address));

        _reserve.withdrawTokens(proxy, _amount);

        address payable taskExecutor = payable(registry.getAddr(TASK_EXECUTOR_ID));
        // call next Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            taskExecutor,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currTask, bytes32(_amount + _fee))
        );

        // return FL
        address payable aaveCore = addressesProvider.getLendingPoolCore();

        if (_reserve == TokenUtils.ETH_ADDR) {
            (bool success, ) = aaveCore.call{value: (_amount + _fee)}("");
            require(success, ERR_ETH_FL_PAYBACK);
        } else {
            _reserve.withdrawTokens(aaveCore, (_amount + _fee));
        }
    }

    function parseInputs(bytes[] memory _callData)
        public
        pure
        returns (
            uint256 amount,
            address token,
            address flParamGetterAddr,
            bytes memory flParamGetterData
        )
    {
        amount = abi.decode(_callData[0], (uint256));
        token = abi.decode(_callData[1], (address));
        flParamGetterAddr = abi.decode(_callData[2], (address));
        flParamGetterData = abi.decode(_callData[3], (bytes));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
