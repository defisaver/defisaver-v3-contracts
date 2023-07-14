// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../utils/ReentrancyGuard.sol";

import "../../interfaces/flashloan/IFlashLoanBase.sol";
import "../../core/strategy/StrategyModel.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/IFLParamGetter.sol";

import "../../interfaces/uniswap/v3/IUniswapV3Pool.sol";
import "../../interfaces/uniswap/v3/IUniswapV3Factory.sol";
import "../../interfaces/uniswap/v3/IUniswapV3FlashCallback.sol";

import "../../utils/TokenUtils.sol";
import "../../utils/FullMath.sol";

import "./helpers/FLHelper.sol";

contract FLUniV3 is ActionBase, ReentrancyGuard, IFlashLoanBase, IUniswapV3FlashCallback, StrategyModel, FLHelper {
    using TokenUtils for address;

    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR = bytes4(keccak256("_executeActionsFromFL((string,bytes[],bytes32[],bytes4[],uint8[][]),bytes32)"));
    bytes4 public constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));
    
    error UntrustedLender();
    error WrongPaybackAmount(uint256 tokenNo, uint256 balance, uint256 expected);

    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        FlashLoanParams memory params = parseInputs(_callData);

        if (params.flParamGetterAddr != address(0)) {
            (, uint256[] memory amounts,) =
                IFLParamGetter(params.flParamGetterAddr).getFlashLoanParams(params.flParamGetterData);

            params.amounts[0] = amounts[0];
        }

        uint256 amount = _flUniV3(params);
        return bytes32(amount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    function _flUniV3(FlashLoanParams memory _params) internal returns (uint256) {
        // modes aren't used so we set them to later know starting balances
        _params.modes = new uint256[](2);
        _params.modes[0] = _params.amounts[0] > 0 ? _params.tokens[0].getBalance(address(this)) : 0; 
        _params.modes[1] = _params.amounts[1] > 0 ? _params.tokens[1].getBalance(address(this)) : 0; 

        /// @dev FlashLoanParams.tokens, first two array indexes contain tokens, third index contains pool address
        IUniswapV3Pool(_params.tokens[2]).flash(
            address(this),
            _params.amounts[0],
            _params.amounts[1],
            abi.encode(_params)
        );
        return (_params.amounts[0] > 0 ? _params.amounts[0] : _params.amounts[1]);
    }

    function uniswapV3FlashCallback(uint256 _fee0, uint256 _fee1, bytes memory _params) external override nonReentrant {
        FlashLoanParams memory params = abi.decode(_params, (FlashLoanParams));
        {
            uint24 fee = IUniswapV3Pool(msg.sender).fee();
            address realPool = IUniswapV3Factory(UNI_V3_FACTORY).getPool(params.tokens[0], params.tokens[1], uint24(fee));
            if (msg.sender != realPool) revert UntrustedLender();
        }

        (Recipe memory currRecipe, address proxy) = abi.decode(params.recipeData, (Recipe, address));
        address payable recipeExecutorAddr = payable(registry.getAddr(RECIPE_EXECUTOR_ID));
        
        params.tokens[0].withdrawTokens(proxy, params.amounts[0]);
        params.tokens[1].withdrawTokens(proxy, params.amounts[1]);

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutorAddr,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currRecipe, params.amounts[0])
        );

        uint256 expectedBalance0 = params.modes[0] + params.amounts[0] + _fee0;
        uint256 expectedBalance1 = params.modes[1] + params.amounts[1] + _fee1;

        uint256 currBalance0 = params.amounts[0] > 0 ? params.tokens[0].getBalance(address(this)) : 0;
        uint256 currBalance1 = params.amounts[1] > 0 ? params.tokens[1].getBalance(address(this)) : 0;

        bool isCorrectAmount0 = currBalance0 == expectedBalance0;
        bool isCorrectAmount1 = currBalance1 == expectedBalance1;

        if (params.amounts[0] > 0 && params.tokens[0] == ST_ETH_ADDR && !isCorrectAmount0) {
            flFeeFaucet.my2Wei(ST_ETH_ADDR);
            isCorrectAmount0 = true;
        }
        if (params.amounts[1] > 0 && params.tokens[1] == ST_ETH_ADDR && !isCorrectAmount1) {
            flFeeFaucet.my2Wei(ST_ETH_ADDR);
            isCorrectAmount1 = true;
        }
        
        if (!isCorrectAmount0) revert WrongPaybackAmount(0, currBalance0, expectedBalance0); 
        if (!isCorrectAmount1) revert WrongPaybackAmount(1, currBalance1, expectedBalance1);
        
        params.tokens[0].withdrawTokens(msg.sender, params.amounts[0] + _fee0);
        params.tokens[1].withdrawTokens(msg.sender, params.amounts[1] + _fee1);
    }

    function calculateFee(address _pool, uint256 _amount0, uint256 _amount1) public view returns(uint256 fee0, uint256 fee1) {
        uint256 fee = IUniswapV3Pool(_pool).fee();

        fee0 = FullMath.mulDivRoundingUp(_amount0, fee, 1e6);
        fee1 = FullMath.mulDivRoundingUp(_amount1, fee, 1e6);
    }


    function parseInputs(bytes memory _callData)
        public
        pure
        returns (FlashLoanParams memory params)
    {
        params = abi.decode(_callData, (FlashLoanParams));
    }
}