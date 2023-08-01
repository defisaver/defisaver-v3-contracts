// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
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
contract FLGho is ActionBase, StrategyModel, ReentrancyGuard, FLHelper, IFlashLoanBase {
    using SafeERC20 for IERC20;
    using TokenUtils for address;

    //Caller not GHO Flash Minter
    error UntrustedLender();
    //FL Taker must be this contract
    error UntrustedInitiator();
    // Wrong FL payback amount sent
    error WrongPaybackAmountError();

    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 internal constant CALLBACK_SELECTOR =
        bytes4(
            keccak256(
                "_executeActionsFromFL((string,bytes[],bytes32[],bytes4[],uint8[][]),bytes32)"
            )
        );
    bytes4 internal constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    bytes32 internal constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable override returns (bytes32) {
        FlashLoanParams memory params = parseInputs(_callData);

        if (params.flParamGetterAddr != address(0)) {
            (, uint256[] memory amounts, ) = IFLParamGetter(params.flParamGetterAddr)
                .getFlashLoanParams(params.flParamGetterData);

            params.amounts[0] = amounts[0];
        }
        bytes memory recipeData = params.recipeData;
        uint256 amount = _flGho(params.amounts[0], recipeData);

        return bytes32(amount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Gets a GHO FL from Gho Flash Minter
    /// @param _amount Amount of GHO to FL
    /// @param _params Rest of the data we have in the recipe
    function _flGho(uint256 _amount, bytes memory _params) internal returns (uint) {
        IERC3156FlashLender(GHO_FLASH_MINTER_ADDR).flashLoan(
            IERC3156FlashBorrower(address(this)),
            GHO_ADDR,
            _amount,
            _params
        );

        emit ActionEvent("FLGho", abi.encode(_amount));

        return _amount;
    }

    /// @notice ERC3156 callback function that formats and calls back RecipeExecutor
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

        uint256 paybackAmount = _amount + _fee;
        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutorAddr,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currRecipe, paybackAmount)
        );
        if (_token.getBalance(address(this)) != paybackAmount + balanceBefore) {
            revert WrongPaybackAmountError();
        }

        _token.approveToken(GHO_FLASH_MINTER_ADDR, paybackAmount);

        return CALLBACK_SUCCESS;
    }

    function parseInputs(
        bytes memory _callData
    ) public pure returns (FlashLoanParams memory inputData) {
        inputData = abi.decode(_callData, (FlashLoanParams));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
