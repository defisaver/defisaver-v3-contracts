// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/IFLParamGetter.sol";
import "../../interfaces/aaveV3/IPoolV3.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/ReentrancyGuard.sol";
import "./helpers/FLHelper.sol";
import "../../interfaces/flashloan/IFlashLoanBase.sol";
import "../../interfaces/aaveV3/IDebtToken.sol";

/// @title Action that gets and receives a FL from Aave V3 and does not return funds but opens debt position on Aave V3
/// @dev In order to open debt position, FL action must have credit delegation allowance from onBehalfOf address
/// @dev No credit delegation allowance should be left after FL to prevent someone to borrow funds and generate debt onBehalfOf address 
contract FLAaveV3CarryDebt is ActionBase, ReentrancyGuard, FLHelper, IFlashLoanBase {
    using TokenUtils for address;

    //Caller not aave pool
    error OnlyAaveCallerError();
    //FL Taker must be this contract
    error SameCallerError();
    //Interest rate can't be 0 for opening depth position on Aave V3
    error NoInterestRateSetError();
    //Credit delegation allowance must be 0 after FL
    error CreditDelegationAllowanceLeftError(uint256 amountLeft);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public override payable returns (bytes32) {
        FlashLoanParams memory flData = parseInputs(_callData);

        // check to make sure modes are not 0
        for (uint256 i = 0; i < flData.modes.length; ++i) {
            if (flData.modes[i] == 0) {
                revert NoInterestRateSetError();
            }
        }

        // if we want to get on chain info about FL params
        if (flData.flParamGetterAddr != address(0)) {
            (flData.tokens, flData.amounts, flData.modes) =
                IFLParamGetter(flData.flParamGetterAddr).getFlashLoanParams(flData.flParamGetterData);
        }

        bytes memory recipeData = flData.recipeData;
        uint flAmount = _flAaveV3(flData, recipeData);

        // revert if some credit delegation allowance is left
        for (uint256 i = 0; i < flData.tokens.length; ++i) {
            DataTypes.ReserveData memory reserveData = IPoolV3(AAVE_V3_LENDING_POOL).getReserveData(flData.tokens[i]);
            
            address debtToken = DataTypes.InterestRateMode(flData.modes[i]) == DataTypes.InterestRateMode.VARIABLE 
                ? reserveData.variableDebtTokenAddress 
                : reserveData.stableDebtTokenAddress;
            
            uint256 creditDelegationAllowance = IDebtToken(debtToken).borrowAllowance(
                flData.onBehalfOf,
                address(this)
            );
            
            if (creditDelegationAllowance > 0) {
                revert CreditDelegationAllowanceLeftError(creditDelegationAllowance);
            }
        }

        return bytes32(flAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public override pure returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Gets a Fl from AaveV3 and returns back the execution to the action address
    /// @param _flData All the amounts/tokens and related aave fl data
    /// @param _params Rest of the data we have in the recipe
    function _flAaveV3(FlashLoanParams memory _flData, bytes memory _params) internal returns (uint) {

        IPoolV3(AAVE_V3_LENDING_POOL).flashLoan(
            address(this),
            _flData.tokens,
            _flData.amounts,
            _flData.modes,
            _flData.onBehalfOf,
            _params,
            AAVE_REFERRAL_CODE
        );

        emit ActionEvent(
            "FLAaveV3CarryDebt",
            abi.encode(_flData.tokens, _flData.amounts, _flData.modes, _flData.onBehalfOf)
        );

        return _flData.amounts[0];
    }

    /// @notice Aave callback function that formats and calls back RecipeExecutor
    /// @dev FL amount is not returned, instead debt position is opened
    function executeOperation(
        address[] memory _assets,
        uint256[] memory _amounts,
        uint256[] memory,
        address _initiator,
        bytes memory _params
    ) public nonReentrant returns (bool) {
        if (msg.sender != AAVE_V3_LENDING_POOL){
            revert OnlyAaveCallerError();
        }
        if (_initiator != address(this)){
            revert SameCallerError();
        }

        (Recipe memory currRecipe, address wallet) = abi.decode(_params, (Recipe, address));

        // Send FL amounts to user wallet
        for (uint256 i = 0; i < _assets.length; ++i) {
            _assets[i].withdrawTokens(wallet, _amounts[i]);
        }

        _executeRecipe(wallet, isDSProxy(wallet), currRecipe, _amounts[0]);

        return true;
    }

    function parseInputs(bytes memory _callData) public pure returns (FlashLoanParams memory inputData) {
        inputData = abi.decode(_callData, (FlashLoanParams));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
