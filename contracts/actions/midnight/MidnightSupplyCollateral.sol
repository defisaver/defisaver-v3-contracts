// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { Market } from "../../interfaces/protocols/midnight/IMidnight.sol";
import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { MidnightHelper } from "./helpers/MidnightHelper.sol";

/// @title MidnightSupplyCollateral
contract MidnightSupplyCollateral is ActionBase, MidnightHelper {
    using TokenUtils for address;

    /// @param marketId Market id.
    /// @param onBehalf Address to supply tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param from Address from which to pull collateral asset.
    /// @param amount Amount of tokens to supply.
    /// @param collateralIndex Collateral index (0-based).
    struct Params {
        bytes32 marketId;
        address onBehalf;
        address from;
        uint256 amount;
        uint256 collateralIndex;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.marketId =
            _parseParamABytes32(params.marketId, _paramMapping[0], _subData, _returnValues);
        params.onBehalf =
            _parseParamAddr(params.onBehalf, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
        params.collateralIndex =
            _parseParamUint(params.collateralIndex, _paramMapping[4], _subData, _returnValues);

        (uint256 amount, bytes memory logData) = _supplyCollateral(params);
        emit ActionEvent("MidnightSupplyCollateral", logData);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supplyCollateral(params);
        logger.logActionDirectEvent("MidnightSupplyCollateral", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _supplyCollateral(Params memory _params) internal returns (uint256, bytes memory) {
        Market memory market = MIDNIGHT.toMarket(_params.marketId);

        if (_params.collateralIndex >= market.collateralParams.length) {
            revert InvalidCollateralIndex();
        }

        address token = market.collateralParams[_params.collateralIndex].token;
        address onBehalf = _params.onBehalf == address(0) ? address(this) : _params.onBehalf;

        _params.amount = token.pullTokensIfNeeded(_params.from, _params.amount);
        token.approveToken(address(MIDNIGHT), _params.amount);
        MIDNIGHT.supplyCollateral(market, _params.collateralIndex, _params.amount, onBehalf);

        bytes memory logData =
            abi.encode(_params.marketId, onBehalf, _params.from, _params.amount, token);

        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
