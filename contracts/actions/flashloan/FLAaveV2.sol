// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "../ActionBase.sol";
import "../../core/strategy/Subscriptions.sol";
import "../../interfaces/IFLParamGetter.sol";
import "../../interfaces/ILendingPool.sol";
import "../../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import "../../interfaces/aaveV2/ILendingPoolV2.sol";
import "../../core/strategy/StrategyData.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/ReentrancyGuard.sol";

/// @title Action that gets and receives a FL from Aave V2
contract FLAaveV2 is ActionBase, StrategyData, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    //Caller not aave pool
    error OnlyAaveCallerError();
    //FL Taker must be this contract
    error SameCallerError();

    address
        public constant AAVE_LENDING_POOL = 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9;

    ILendingPoolAddressesProviderV2
        public constant addressesProvider = ILendingPoolAddressesProviderV2(
        0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    );

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint16 public constant AAVE_REFERRAL_CODE = 64;

    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR = 0xd6741b9e;

    bytes4 constant TASK_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    struct Params {
        address[] tokens;
        uint256[] amounts;
        uint256[] modes;
        address onBehalfOf;
        address flParamGetterAddr;
        bytes flParamGetterData;
        bytes taskData;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        Params memory flData = parseInputs(_callData);

        // if we want to get on chain info about FL params
        if (flData.flParamGetterAddr != address(0)) {
            (flData.tokens, flData.amounts, flData.modes) =
                IFLParamGetter(flData.flParamGetterAddr).getFlashLoanParams(flData.flParamGetterData);
        }

        bytes memory taskData = flData.taskData; // TODO: Fix this
        uint flAmount = _flAaveV2(flData, taskData);

        return bytes32(flAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Gets a Fl from AaveV2 and returns back the execution to the action address
    /// @param _flData All the amounts/tokens and related aave fl data
    /// @param _params Rest of the data we have in the task
    function _flAaveV2(Params memory _flData, bytes memory _params) internal returns (uint) {

        ILendingPoolV2(AAVE_LENDING_POOL).flashLoan(
            address(this),
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

    /// @notice Aave callback function that formats and calls back RecipeExecutor
    function executeOperation(
        address[] memory _assets,
        uint256[] memory _amounts,
        uint256[] memory _fees,
        address _initiator,
        bytes memory _params
    ) public nonReentrant returns (bool) {
        if (msg.sender != AAVE_LENDING_POOL){
            revert OnlyAaveCallerError();
        }
        if (_initiator != address(this)){
            revert SameCallerError();
        }

        (Recipe memory currTask, address proxy) = abi.decode(_params, (Recipe, address));

        // Send FL amounts to user proxy
        for (uint256 i = 0; i < _assets.length; ++i) {
            _assets[i].withdrawTokens(proxy, _amounts[i]);
        }

        address payable recipeExecutor = payable(registry.getAddr(TASK_EXECUTOR_ID));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutor,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currTask, bytes32(_amounts[0] + _fees[0]))
        );

        // return FL
        for (uint256 i = 0; i < _assets.length; i++) {
            _assets[i].approveToken(address(AAVE_LENDING_POOL), _amounts[i] + _fees[i]);
        }

        return true;
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
