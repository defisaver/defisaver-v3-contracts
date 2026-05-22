// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IPoolV3 } from "../../interfaces/protocols/aaveV3/IPoolV3.sol";
import { IFlashLoanBase } from "../../interfaces/flashloan/IFlashLoanBase.sol";
import { IFLParamGetter } from "../../interfaces/flashloan/IFLParamGetter.sol";
import { IDebtToken } from "../../interfaces/protocols/aaveV3/IDebtToken.sol";

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { ReentrancyGuard } from "../../_vendor/openzeppelin/ReentrancyGuard.sol";
import { FLHelper } from "./helpers/FLHelper.sol";

/// @title FLAaveV3CarryDebt
/// @notice Action that gets and receives a FL from Aave V3 and does not return funds but generates debt on Aave V3
/// @notice This action doesn't have any flashloan fees
/// @dev In order to generate debt, this contract must have credit delegation allowance from onBehalfOf address
contract FLAaveV3CarryDebt is ActionBase, ReentrancyGuard, FLHelper, IFlashLoanBase {
    using TokenUtils for address;

    /// @dev FL Initiator must be this contract
    error UntrustedInitiator();
    /// @dev Caller in these functions must be relevant FL source address
    error UntrustedLender();
    /// @dev Credit delegation allowance must be 0 after FL
    error CreditDelegationAllowanceLeftError(uint256 amountLeft);

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override { }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable override returns (bytes32) {
        FlashLoanParams memory params = parseInputs(_callData);

        // If we want to get on chain info about FL params.
        if (params.flParamGetterAddr != address(0)) {
            (params.tokens, params.amounts, params.modes) = IFLParamGetter(params.flParamGetterAddr)
                .getFlashLoanParams(params.flParamGetterData);
        }

        // Trigger flashloan. This will move execution to 'executeOperation' function.
        IPoolV3(AAVE_V3_LENDING_POOL)
            .flashLoan(
                address(this),
                params.tokens,
                params.amounts,
                params.modes,
                params.onBehalfOf,
                params.recipeData,
                AAVE_REFERRAL_CODE
            );

        // Once we are here, this means that we already executed all other actions in the recipe.
        // In that case, verify that there is no credit delegation allowance left on this contract.
        for (uint256 i = 0; i < params.tokens.length; ++i) {
            address token =
                IPoolV3(AAVE_V3_LENDING_POOL).getReserveVariableDebtToken(params.tokens[i]);
            uint256 allowance = IDebtToken(token).borrowAllowance(params.onBehalfOf, address(this));
            if (allowance > 0) revert CreditDelegationAllowanceLeftError(allowance);
        }

        // Emit event.
        emit ActionEvent(
            "FLAaveV3CarryDebt",
            abi.encode(params.tokens, params.amounts, params.modes, params.onBehalfOf)
        );

        // In practice, this value is not used and is overwritten in RecipeExecutor:executeActionsFromFL,
        // where the actual flash loan amount is set as the first return value,
        // which is then used by subsequent actions.
        return bytes32(params.amounts[0]);
    }

    /*//////////////////////////////////////////////////////////////
                              CALLBACK
    //////////////////////////////////////////////////////////////*/
    /// @notice Aave callback function that formats and calls back RecipeExecutor
    /// FLSource == AAVE_V3
    /// Can have fees = YES
    /// @dev FL amount is not returned, instead debt is carried into the position.
    function executeOperation(
        address[] memory _assets,
        uint256[] memory _amounts,
        uint256[] memory,
        /* _fees */
        address _initiator,
        bytes memory _params
    ) public nonReentrant returns (bool) {
        if (msg.sender != AAVE_V3_LENDING_POOL) revert UntrustedLender();
        if (_initiator != address(this)) revert UntrustedInitiator();

        (Recipe memory currRecipe, address wallet) = abi.decode(_params, (Recipe, address));

        // Send FL amounts to user wallet.
        for (uint256 i = 0; i < _assets.length; ++i) {
            _assets[i].withdrawTokens(wallet, _amounts[i]);
        }

        // DFS actions can return only one value that can be used by other actions,
        // so we limit the return value to the first flash loan amount.
        _executeRecipe(wallet, _getWalletType(wallet), currRecipe, _amounts[0]);

        // Note: We don't return the FL amount, instead debt is carried into the position.

        return true;
    }

    /*//////////////////////////////////////////////////////////////
                                HELPERS
    //////////////////////////////////////////////////////////////*/
    function parseInputs(bytes memory _callData)
        public
        pure
        returns (FlashLoanParams memory params)
    {
        params = abi.decode(_callData, (FlashLoanParams));
    }
}
