// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CurveUsdHelper.sol";

/// @title CurveUsdSelfLiquidate Closes the users position while he's in soft liquidation
contract CurveUsdSelfLiquidate is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    /// @param controllerAddress Address of the curveusd market controller
    /// @param minCrvUsdExpected Minimum amount of crvUsd as collateral for the user to have
    /// @param from Address from which to pull crvUSD if needed
    /// @param to Address that will receive the crvUSD and collateral asset
    struct Params {
        address controllerAddress;
        uint256 minCrvUsdExpected;
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
        params.minCrvUsdExpected = _parseParamUint(params.minCrvUsdExpected, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[3], _subData, _returnValues);

        (uint256 debtAmount, bytes memory logData) = _execute(params);
        emit ActionEvent("CurveUsdSelfLiquidate", logData);
        return bytes32(debtAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _execute(params);
        logger.logActionDirectEvent("CurveUsdSelfLiquidate", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _execute(Params memory _params) internal returns (uint256, bytes memory) {      
        /// @dev one of the few ways we can check if the controller address is an actual controller
        if (ICrvUsdControllerFactory(CRVUSD_CONTROLLER_FACTORY_ADDR).debt_ceiling(_params.controllerAddress) == 0) revert CurveUsdInvalidController();

        uint256 userWholeDebt = ICrvUsdController(_params.controllerAddress).debt(address(this));
        (uint256 collInCrvUsd, uint256 collInDepositAsset) = getCollAmountsFromAMM(_params.controllerAddress, address(this));

        uint256 amountToPull;

        // if we don't have enough crvUsd in coll, pull the rest from the user
        if (collInCrvUsd < userWholeDebt) {
            amountToPull = userWholeDebt - collInCrvUsd;
        }

        // pull and approve if needed
        amountToPull = CRVUSD_TOKEN_ADDR.pullTokensIfNeeded(_params.from, amountToPull);
        CRVUSD_TOKEN_ADDR.approveToken(_params.controllerAddress, amountToPull);

        ICrvUsdController(_params.controllerAddress).liquidate(address(this), _params.minCrvUsdExpected);

        address collateralAsset = ICrvUsdController(_params.controllerAddress).collateral_token();
        collateralAsset.withdrawTokens(_params.to, collInDepositAsset);

        // send leftover crvUsd to user
        if (collInCrvUsd > userWholeDebt) {
            CRVUSD_TOKEN_ADDR.withdrawTokens(_params.to, (collInCrvUsd - userWholeDebt));
        }

        return (
            userWholeDebt,
            abi.encode(_params, collInCrvUsd, collInDepositAsset, userWholeDebt)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}