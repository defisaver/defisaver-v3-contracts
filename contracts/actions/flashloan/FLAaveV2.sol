// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../core/Subscriptions.sol";
import "../../interfaces/IFLParamGetter.sol";
import "../../interfaces/ILendingPool.sol";
import "../../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import "../../interfaces/aaveV2/ILendingPoolV2.sol";
import "../../core/StrategyData.sol";
import "../../utils/TokenUtils.sol";

/// @title Action that gets and receives a FL from Aave V2
contract FLAaveV2 is ActionBase, StrategyData {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    string constant ERR_ONLY_AAVE_CALLER = "Caller not aave pool";
    string constant ERR_SAME_CALLER = "FL taker must be this contract";

    address
        public constant AAVE_LENDING_POOL = 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9;

    ILendingPoolAddressesProviderV2
        public constant addressesProvider = ILendingPoolAddressesProviderV2(
        0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    );

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint16 public constant AAVE_REFERRAL_CODE = 64;

    bytes4 public constant CALLBACK_SELECTOR = 0xd6741b9e;

    bytes32 constant FL_AAVE_V2_ID = keccak256("FLAaveV2");
    bytes32 constant TASK_EXECUTOR_ID = keccak256("TaskExecutor");

    struct FLAaveV2Data {
        address[] tokens;
        uint256[] amounts;
        uint256[] modes;
        address onBehalfOf;
        address flParamGetterAddr;
        bytes flParamGetterData;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        FLAaveV2Data memory flData = parseInputs(_callData);

        // if we want to get on chain info about FL params
        if (flData.flParamGetterAddr != address(0)) {
            (flData.tokens, flData.amounts, flData.modes) =
                IFLParamGetter(flData.flParamGetterAddr).getFlashLoanParams(flData.flParamGetterData);
        }

        bytes memory taskData = _callData[_callData.length - 1];
        uint flAmount = _flAaveV2(flData, taskData);

        return bytes32(flAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Gets a Fl from AaveV2 and returns back the execution to the action address
    /// @param _flData All the amounts/tokens and related aave fl data
    /// @param _params Rest of the data we have in the task
    function _flAaveV2(FLAaveV2Data memory _flData, bytes memory _params) internal returns (uint) {

        ILendingPoolV2(AAVE_LENDING_POOL).flashLoan(
            payable(registry.getAddr(FL_AAVE_V2_ID)),
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
        address _initiator,
        bytes memory _params
    ) public returns (bool) {
        require(msg.sender == AAVE_LENDING_POOL, ERR_ONLY_AAVE_CALLER);
        require(_initiator == address(this), ERR_SAME_CALLER);

        (Task memory currTask, address proxy) = abi.decode(_params, (Task, address));

        // Send FL amounts to user proxy
        for (uint256 i = 0; i < _assets.length; ++i) {
            _assets[i].withdrawTokens(proxy, _amounts[i]);
        }

        address payable taskExecutor = payable(registry.getAddr(TASK_EXECUTOR_ID));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            taskExecutor,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currTask, bytes32(_amounts[0] + _fees[0]))
        );

        // return FL
        for (uint256 i = 0; i < _assets.length; i++) {
            _assets[i].approveToken(address(AAVE_LENDING_POOL), _amounts[i] + _fees[i]);
        }

        return true;
    }

    function parseInputs(bytes[] memory _callData)
        public
        pure
        returns (FLAaveV2Data memory flData)
    {
        flData.amounts = abi.decode(_callData[0], (uint256[]));
        flData.tokens = abi.decode(_callData[1], (address[]));
        flData.modes = abi.decode(_callData[2], (uint256[]));
        flData.onBehalfOf = abi.decode(_callData[3], (address));
        flData.flParamGetterAddr = abi.decode(_callData[4], (address));
        flData.flParamGetterData = abi.decode(_callData[5], (bytes));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
