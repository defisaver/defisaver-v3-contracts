// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/LlamaLendHelper.sol";

/// @title LlamaLendSelfLiquidate Closes the users position while he's in soft liquidation
contract LlamaLendSelfLiquidate is ActionBase, LlamaLendHelper {
    using TokenUtils for address;

    /// @dev we pull 1000 wei more of debt asset because sometimes AMM.withdraw() math is off by few wei
    uint256 internal constant EXTRA_BUFFER = 1000;

    /// @param controllerAddress Address of the llamalend market controller
    /// @param minDebtAssetExpected Minimum amount of debt asset as collateral for the user to have
    /// @param from Address from which to pull debt asset if needed
    /// @param to Address that will receive the debt asset and collateral asset
    struct Params {
        address controllerAddress;
        uint256 minDebtAssetExpected;
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.controllerAddress = _parseParamAddr(params.controllerAddress, _paramMapping[0], _subData, _returnValues);
        params.minDebtAssetExpected = _parseParamUint(params.minDebtAssetExpected, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[3], _subData, _returnValues);

        ///@dev returning amount of debt asset pulled because it's not known precisely before the execution and can be used with Sub/Sum Inputs Actions later
        (uint256 amountPulled, bytes memory logData) = _llamaLendSelfLiquidate(params);
        emit ActionEvent("LlamaLendSelfLiquidate", logData);
        return bytes32(amountPulled);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _llamaLendSelfLiquidate(params);
        logger.logActionDirectEvent("LlamaLendSelfLiquidate", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _llamaLendSelfLiquidate(Params memory _params) internal returns (uint256, bytes memory) {

        uint256 userWholeDebt = ILlamaLendController(_params.controllerAddress).debt(address(this));
        (uint256 collInDebtAsset, uint256 collInCollateralAsset) = getCollAmountsFromAMM(_params.controllerAddress, address(this));

        uint256 amountToPull;
        address debtAsset = ILlamaLendController(_params.controllerAddress).borrowed_token();
        
        if (collInDebtAsset < userWholeDebt) {
            /// @dev in some cases debt - collInCrvUsd will fall few wei short of closing the position
            // if we don't have enough crvUsd in coll, pull the rest from the user
            amountToPull = userWholeDebt - collInDebtAsset + EXTRA_BUFFER;
            amountToPull = debtAsset.pullTokensIfNeeded(_params.from, amountToPull);
            debtAsset.approveToken(_params.controllerAddress, amountToPull);
        }

        address collateralAsset = ILlamaLendController(_params.controllerAddress).collateral_token();
        
        uint256 collAssetBalancePreLiq = collateralAsset.getBalance(address(this));
        uint256 debtAssetBalancePreLiq = debtAsset.getBalance(address(this));

        ILlamaLendController(_params.controllerAddress).liquidate(address(this), _params.minDebtAssetExpected, false);

        uint256 collAssetBalanceAfterLiq = collateralAsset.getBalance(address(this));

        uint256 collAssetReceivedFromLiq = collAssetBalanceAfterLiq - collAssetBalancePreLiq;
        collateralAsset.withdrawTokens(_params.to, collAssetReceivedFromLiq);

        uint256 debtAssetBalanceAfterLiq = debtAsset.getBalance(address(this));
        
        if (collInDebtAsset > userWholeDebt) {
            // we return any extra debt asset that was left in coll after liquidation
            debtAsset.withdrawTokens(_params.to, debtAssetBalanceAfterLiq - debtAssetBalancePreLiq);
        } else {
            // we return any extra debt asset that was not needed in debt and remove any extra approval
            debtAsset.withdrawTokens(_params.from, amountToPull - (debtAssetBalancePreLiq - debtAssetBalanceAfterLiq));
            IERC20(debtAsset).approve(_params.controllerAddress, 0);
        }

        return (
            collAssetReceivedFromLiq,
            abi.encode(_params, collInDebtAsset, collInCollateralAsset, userWholeDebt)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}