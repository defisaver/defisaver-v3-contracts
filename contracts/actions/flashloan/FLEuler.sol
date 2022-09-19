// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/ReentrancyGuard.sol";
import "../../interfaces/flashloan/IERC3156FlashLender.sol";

import "../../interfaces/flashloan/IFlashLoanBase.sol";
import "../../core/strategy/StrategyModel.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/IFLParamGetter.sol";

import "../../interfaces/euler/IEulerMarkets.sol";
import "../../interfaces/euler/IDToken.sol";

import "../../utils/TokenUtils.sol";
import "../../utils/SafeMath.sol";

import "./helpers/FLHelper.sol";

contract FLEuler is ActionBase, ReentrancyGuard, IFlashLoanBase, StrategyModel, FLHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    struct EulerPassingData {
        uint256 balanceBefore;
        uint256 amount;
        address token;
        bytes recipeData;
    }

    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR = bytes4(keccak256("_executeActionsFromFL((string,bytes[],bytes32[],bytes4[],uint8[][]),bytes32)"));
    bytes4 public constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));


    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        FlashLoanParams memory params = parseInputs(_callData);

        uint256 amount = _flEuler(params);
        return bytes32(amount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    function _flEuler(FlashLoanParams memory _params) internal returns (uint256) {
        IDToken dToken = IDToken(IEulerMarkets(EULER_MARKET_ADDR).underlyingToDToken(_params.tokens[0]));
        EulerPassingData memory passingData = EulerPassingData(
            {
                balanceBefore: _params.tokens[0].getBalance(address(this)),
                amount: _params.amounts[0],
                token: _params.tokens[0],
                recipeData: _params.recipeData
            }
        );
        
        dToken.flashLoan(_params.amounts[0], abi.encode(passingData));

        emit ActionEvent("FLEuler", abi.encode(_params.amounts[0]));
        return _params.amounts[0];
    }

    /// @notice Euler callback function that formats and calls back RecipeExecutor
    function onFlashLoan(
        bytes calldata _data
    ) external nonReentrant{
        EulerPassingData memory passingData = abi.decode(_data, (EulerPassingData));
        require(msg.sender == address(EULER_ADDR), "Untrusted lender");
        
        (Recipe memory currRecipe, address proxy) = abi.decode(passingData.recipeData, (Recipe, address));
        address payable recipeExecutorAddr = payable(registry.getAddr(RECIPE_EXECUTOR_ID));
        passingData.token.withdrawTokens(proxy, passingData.amount);

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutorAddr,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currRecipe, passingData.amount)
        );

        require(passingData.token.getBalance(address(this)) == passingData.amount + passingData.balanceBefore, "Wrong payback amount");

        passingData.token.withdrawTokens(msg.sender, passingData.amount);

    }

    function parseInputs(bytes memory _callData)
        public
        pure
        returns (FlashLoanParams memory params)
    {
        params = abi.decode(_callData, (FlashLoanParams));
    }
}