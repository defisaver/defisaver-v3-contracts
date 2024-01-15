// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../interfaces/morpho-blue/IMorphoBlue.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/IFLParamGetter.sol";
import "../../core/strategy/StrategyModel.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/SafeMath.sol";
import "../../utils/ReentrancyGuard.sol";
import "../../interfaces/flashloan/IFlashLoanBase.sol";

import "./helpers/FLHelper.sol";

contract FLMorphoBlue is ActionBase, ReentrancyGuard, StrategyModel, IFlashLoanBase, FLHelper {
    using TokenUtils for address;
    using SafeMath for uint256;


    //Caller not Morpho Blue
    error UntrustedLender();
    // Wrong FL payback amount sent
    error WrongPaybackAmountError();

    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR = bytes4(keccak256("_executeActionsFromFL((string,bytes[],bytes32[],bytes4[],uint8[][]),bytes32)"));
    bytes32 constant RECIPE_EXECUTOR_ID = keccak256("RecipeExecutor");

    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        FlashLoanParams memory params = parseInputs(_callData);

        if (params.flParamGetterAddr != address(0)) {
            (params.tokens, params.amounts,) =
                IFLParamGetter(params.flParamGetterAddr).getFlashLoanParams(params.flParamGetterData);
        }

        _flMorphoBlue(params);
        return bytes32(params.amounts[0]);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    /// @notice Gets a FL from Morpho blue and returns back the execution to the action address
    function _flMorphoBlue(FlashLoanParams memory _params) internal{
        IMorphoBlue(MORPHO_BLUE_ADDR).flashLoan(
            _params.tokens[0],
            _params.amounts[0],
            abi.encode(_params.recipeData, _params.tokens[0])
        );

        emit ActionEvent("FLMorphoBlue", abi.encode(_params));
    }

    function onMorphoFlashLoan(uint256 assets, bytes calldata data) external nonReentrant{
        if (msg.sender != MORPHO_BLUE_ADDR) {
            revert UntrustedLender();
        }
        (bytes memory taskData, address token) = abi.decode(data, (bytes, address));
        (Recipe memory currRecipe, address proxy) = abi.decode(taskData, (Recipe, address));

        token.withdrawTokens(proxy, assets);

        uint256 balanceBefore = token.getBalance(address(this));
        address payable recipeExecutorAddr = payable(registry.getAddr(bytes4(RECIPE_EXECUTOR_ID)));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutorAddr,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currRecipe, assets)
        );

        if (token.getBalance(address(this)) != assets + balanceBefore) {
            revert WrongPaybackAmountError();
        }

        token.approveToken(MORPHO_BLUE_ADDR, assets);
    }

    function parseInputs(bytes memory _callData)
        public
        pure
        returns (FlashLoanParams memory params)
    {
        params = abi.decode(_callData, (FlashLoanParams));
    }
}