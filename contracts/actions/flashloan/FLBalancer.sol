// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";

import { IFlashLoanRecipient } from "../../interfaces/balancer/IFlashLoanRecipient.sol";
import { IFlashLoans } from "../../interfaces/balancer/IFlashLoans.sol";
import { IDSProxy } from "../../interfaces/IDSProxy.sol";
import { IFLParamGetter } from "../../interfaces/IFLParamGetter.sol";
import { IFlashLoanBase } from "../../interfaces/flashloan/IFlashLoanBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ReentrancyGuard } from "../../utils/ReentrancyGuard.sol";

import { FLHelper } from "./helpers/FLHelper.sol";

contract FLBalancer is ActionBase, ReentrancyGuard, IFlashLoanRecipient, IFlashLoanBase, FLHelper {
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

        emit ActionEvent("FLBalancer", abi.encode(_params));
        return _params.amounts[0];
    }

    /// @notice Balancer FL callback function that formats and calls back RecipeExecutor
    function receiveFlashLoan(
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _feeAmounts,
        bytes memory _userData
    ) external override nonReentrant {
        require(msg.sender == VAULT_ADDR, "Untrusted lender");
        (Recipe memory currRecipe, address wallet) = abi.decode(_userData, (Recipe, address));

        uint256[] memory balancesBefore = new uint256[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; i++) {
            _tokens[i].withdrawTokens(wallet, _amounts[i]);
            balancesBefore[i] = _tokens[i].getBalance(address(this));
        }

        _executeRecipe(wallet, _getWalletType(wallet), currRecipe, (_amounts[0] + _feeAmounts[0]));

        for (uint256 i = 0; i < _tokens.length; i++) {
            uint256 paybackAmount = _amounts[i] + _feeAmounts[i];
            
            require(_tokens[i].getBalance(address(this)) == paybackAmount + balancesBefore[i], "Wrong payback amount");

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