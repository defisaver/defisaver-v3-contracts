// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;
pragma experimental ABIEncoderV2;

import "../balancer/helpers/BalancerV2Helper.sol";
import "../ActionBase.sol";

import "../../interfaces/balancer/IFlashLoanRecipient.sol";
import "../../interfaces/balancer/IFlashLoans.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/IFLParamGetter.sol";
import "../../interfaces/flashloan/IFlashLoanBase.sol";
import "../../core/strategy/StrategyModel.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/SafeMath.sol";
import "../../utils/ReentrancyGuard.sol";

contract FLBalancer is ActionBase, ReentrancyGuard, IFlashLoanRecipient, BalancerV2Helper, IFlashLoanBase, StrategyModel {
    using TokenUtils for address;
    using SafeMath for uint256;

    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR = bytes4(keccak256("_executeActionsFromFL((string,bytes[],bytes32[],bytes4[],uint8[][]),bytes32)"));
    bytes32 constant RECIPE_EXECUTOR_ID = keccak256("RecipeExecutor");

    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

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

        bytes memory recipeData = params.recipeData;

        uint256 amount = _flBalancer(params, recipeData);
        return bytes32(amount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    /// @notice Gets a FL from Balancer and returns back the execution to the action address
    function _flBalancer(FlashLoanParams memory _params, bytes memory _taskData) internal returns (uint256) {
        IFlashLoans(VAULT_ADDR).flashLoan(
            address(this),
            _params.tokens,
            _params.amounts,
            _taskData
        );

        logger.Log(
            address(this),
            msg.sender,
            "FLBalancer",
            abi.encode(
                _params
            )
        );

        return _params.amounts[0];
    }

    /// @notice Balancer FL callback function that formats and calls back TaskExecutor
    function receiveFlashLoan(
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _feeAmounts,
        bytes memory _userData
    ) external override nonReentrant {
        require(msg.sender == VAULT_ADDR, "Untrusted lender");
        (Recipe memory currRecipe, address proxy) = abi.decode(_userData, (Recipe, address));

        for (uint256 i = 0; i < _tokens.length; i++) {
            _tokens[i].withdrawTokens(proxy, _amounts[i]);
        }
        address payable recipeExecutorAddr = payable(registry.getAddr(bytes4(RECIPE_EXECUTOR_ID)));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutorAddr,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currRecipe, _amounts[0].add(_feeAmounts[0]))
        );

        for (uint256 i = 0; i < _tokens.length; i++) {
            uint256 paybackAmount = _amounts[i].add(_feeAmounts[i]);
            
            require(_tokens[i].getBalance(address(this)) == paybackAmount, "Wrong payback amount");

            _tokens[i].withdrawTokens(address(VAULT_ADDR), paybackAmount);
        }
    }

    function parseInputs(bytes memory _callData)
        public
        pure
        returns (FlashLoanParams memory params)
    {
        params = abi.decode(_callData, (FlashLoanParams));
    }
}