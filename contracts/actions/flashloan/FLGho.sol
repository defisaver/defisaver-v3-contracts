// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/IFLParamGetter.sol";
import "../../interfaces/flashloan/IERC3156FlashLender.sol";
import "../../core/strategy/StrategyModel.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/ReentrancyGuard.sol";
import "./helpers/FLHelper.sol";
import "../../interfaces/flashloan/IFlashLoanBase.sol";
import "../../core/strategy/StrategyModel.sol";


/// @title Action that gets and receives a FL from GHO Flash Minter
contract FLGho is ActionBase, StrategyModel, ReentrancyGuard, FLHelper, IFlashLoanBase, DSMath {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    //Caller not GHO Flash Minter 
    error UntrustedLender();
    //FL Taker must be this contract
    error UntrustedInitiator();
    // Wrong FL payback amount sent
    error WrongPaybackAmountError(); 


    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR =
        bytes4(
            keccak256(
                "_executeActionsFromFL((string,bytes[],bytes32[],bytes4[],uint8[][]),bytes32)"
            )
        );
    bytes4 public constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        FlashLoanParams memory flData = parseInputs(_callData);

        // if we want to get on chain info about FL params
        if (flData.flParamGetterAddr != address(0)) {
            (flData.tokens, flData.amounts, flData.modes) =
                IFLParamGetter(flData.flParamGetterAddr).getFlashLoanParams(flData.flParamGetterData);
        }

        bytes memory recipeData = flData.recipeData;
        uint flAmount = _flGho(flData, recipeData);

        return bytes32(flAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Gets a GHO FL from Gho Flash Minter
    /// @param _flData All the amounts/tokens and related aave fl data
    /// @param _params Rest of the data we have in the recipe
    function _flGho(FlashLoanParams memory _flData, bytes memory _params) internal returns (uint) {
        
        IERC3156FlashLender(GHO_FLASH_MINTER_ADDR).flashLoan(
            IERC3156FlashBorrower(address(this)),
            _flData.tokens[0],
            _flData.amounts[0],
            _params
        );
        
        emit ActionEvent(
            "FLGho",
            abi.encode()
        );

        return _flData.amounts[0];
    }

     /// @notice ERC3156 callback function that formats and calls back RecipeExecutor
    /// FLSource == MAKER
    function onFlashLoan(
        address _initiator,
        address _token,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _data
    ) external nonReentrant returns (bytes32) {
        if (msg.sender != GHO_FLASH_MINTER_ADDR) {
            revert UntrustedLender();
        }
        if (_initiator != address(this)) {
            revert UntrustedInitiator();
        }

        (Recipe memory currRecipe, address proxy) = abi.decode(_data, (Recipe, address));
        _token.withdrawTokens(proxy, _amount);
        uint256 balanceBefore = _token.getBalance(address(this));

        address payable recipeExecutorAddr = payable(registry.getAddr(bytes4(RECIPE_EXECUTOR_ID)));

        uint256 paybackAmount = _amount +_fee;
        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutorAddr,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currRecipe, paybackAmount)
        );
        if (_token.getBalance(address(this)) != paybackAmount + balanceBefore) {
            revert WrongPaybackAmountError();
        }

        _token.approveToken(GHO_FLASH_MINTER_ADDR, paybackAmount);

        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    function parseInputs(bytes memory _callData) public pure returns (FlashLoanParams memory inputData) {
        inputData = abi.decode(_callData, (FlashLoanParams));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
