// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../../interfaces/IDSProxy.sol";
import "../../../interfaces/ILendingPool.sol";
import "../../../interfaces/IWETH.sol";
import "../../../interfaces/IFLParamGetter.sol";
import "../../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../../core/strategy/StrategyModel.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/FLFeeFaucet.sol";
import "../../../utils/ReentrancyGuard.sol";
import "../../ActionBase.sol";
import "./DydxFlashLoanBase.sol";
import "../../../interfaces/flashloan/IFlashLoanBase.sol";

/// @title Action that gets and receives a FL from DyDx protocol
contract FLDyDx is ActionBase, StrategyModel, DydxFlashLoanBase, ReentrancyGuard, IFlashLoanBase {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    //Caller not dydx
    error OnlyDyDxCallerError();
    //FL taker must be this contract
    error SameCallerError();

    uint256 public constant DYDX_DUST_FEE = 2;

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    FLFeeFaucet public constant flFeeFaucet = FLFeeFaucet(0x47f159C90850D5cE09E21F931d504536840f34b4);

    bytes4 constant TASK_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable override returns (bytes32) {

        FlashLoanParams memory inputData = parseInputs(_callData);
         // if we want to get on chain info about FL params
        if (inputData.flParamGetterAddr != address(0)) {
            (address[] memory tokens, uint256[] memory amounts, ) =
                IFLParamGetter(inputData.flParamGetterAddr).getFlashLoanParams(inputData.flParamGetterData);

            inputData.amounts[0] = amounts[0];
            inputData.tokens[0] = tokens[0];
        }

        bytes memory taskData = inputData.taskData;
        uint256 flAmount = _flDyDx(inputData.amounts[0], inputData.tokens[0], abi.encode(taskData, inputData.amounts[0], inputData.tokens[0]));
        return bytes32(flAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Gets a Fl from Dydx and returns back the execution to the action address
    /// @param _amount Amount of tokens to FL
    /// @param _token Token address we want to FL
    /// @param _data Rest of the data we have in the task
    function _flDyDx(
        uint256 _amount,
        address _token,
        bytes memory _data
    ) internal returns (uint256) {

        address payable receiver = payable(address(this));

        ISoloMargin solo = ISoloMargin(SOLO_MARGIN_ADDRESS);

        // Get marketId from token address
        uint256 marketId = _getMarketIdFromTokenAddress(SOLO_MARGIN_ADDRESS, _token);

        uint256 repayAmount = _getRepaymentAmountInternal(_amount);

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

    /// @notice Dydx callback function that formats and calls back RecipeExecutor
    function callFunction(
        address _initiator,
        Account.Info memory,
        bytes memory _data
    ) public nonReentrant {
        if (msg.sender != SOLO_MARGIN_ADDRESS){
            revert OnlyDyDxCallerError();
        }
        if (_initiator != address(this)){
            revert SameCallerError();
        }
        (bytes memory callData, uint256 amount, address tokenAddr) =
            abi.decode(_data, (bytes, uint256, address));

        (Recipe memory currTask, address proxy) = abi.decode(callData, (Recipe, address));
        tokenAddr.withdrawTokens(proxy, amount);

        address payable RecipeExecutor = payable(registry.getAddr(TASK_EXECUTOR_ID));
        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            RecipeExecutor,
            abi.encodeWithSignature("_executeActionsFromFL((string,bytes[],bytes[],bytes4[],uint8[][]),bytes32)", currTask, amount)
        );
        // return FL (just send funds to this addr)
        
        flFeeFaucet.my2Wei(tokenAddr); // get extra 2 wei for DyDx fee
    }

    function parseInputs(bytes memory _callData) public pure returns (FlashLoanParams memory inputData) {
        inputData = abi.decode(_callData, (FlashLoanParams));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
