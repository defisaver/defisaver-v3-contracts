// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../utils/ReentrancyGuard.sol";
import "../../interfaces/flashloan/IERC3156FlashBorrower.sol";
import "../../interfaces/flashloan/IERC3156FlashLender.sol";

import "../../interfaces/flashloan/IFlashLoanBase.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/IFLParamGetter.sol";
import "../../interfaces/flashloan/IFlashLoanBase.sol";

import "../../utils/TokenUtils.sol";

import "./helpers/FLHelper.sol";

contract FLMaker is ActionBase, ReentrancyGuard, IERC3156FlashBorrower, IFlashLoanBase, FLHelper {
    using TokenUtils for address;

    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

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
        bytes memory recipeData = params.recipeData;
        uint256 amount = _flMaker(params.amounts[0], recipeData);
        return bytes32(amount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    /// @notice Gets a DAI flash loan from Maker and returns back the execution to the action address
    /// @param _amount Amount of DAI to FL
    /// @param _taskData Rest of the data we have in the task
    function _flMaker(uint256 _amount, bytes memory _taskData) internal returns (uint256) {
        IERC3156FlashLender(DSS_FLASH_ADDR).flashLoan(
            IERC3156FlashBorrower(address(this)),
            DAI_ADDR,
            _amount,
            _taskData
        );

        emit ActionEvent("FLMaker", abi.encode(_amount));
        return _amount;
    }

    /// @notice ERC3156 callback function that formats and calls back RecipeExecutor
    function onFlashLoan(
        address _initiator,
        address _token,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _data
    ) external override nonReentrant returns (bytes32) {
        require(msg.sender == address(DSS_FLASH_ADDR), "Untrusted lender");
        require(_initiator == address(this), "Untrusted loan initiator");

        (Recipe memory currRecipe, address wallet) = abi.decode(_data, (Recipe, address));
        _token.withdrawTokens(wallet, _amount);
        uint256 balanceBefore = _token.getBalance(address(this));

        uint256 paybackAmount = _amount + _fee;

        _executeRecipe(wallet, isDSProxy(wallet), currRecipe, paybackAmount);

        require(_token.getBalance(address(this)) == paybackAmount + balanceBefore, "Wrong payback amount");

        _token.approveToken(DSS_FLASH_ADDR, paybackAmount);
        return CALLBACK_SUCCESS;
    }

    function parseInputs(bytes memory _callData)
        public
        pure
        returns (FlashLoanParams memory params)
    {
        params = abi.decode(_callData, (FlashLoanParams));
    }
}