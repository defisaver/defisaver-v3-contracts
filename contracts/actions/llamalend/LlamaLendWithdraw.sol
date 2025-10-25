// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { LlamaLendHelper } from "./helpers/LlamaLendHelper.sol";
import { ILlamaLendController } from "../../interfaces/protocols/llamalend/ILlamaLendController.sol";

/// @title Action that withdraws collateral from user's wallet llamalend position
/// @dev collateralAmount must be non-zero
/// @dev if collateralAmount == uintMax will withdraw as much as the debt will allow
contract LlamaLendWithdraw is ActionBase, LlamaLendHelper {
    using TokenUtils for address;

    error ZeroAmountWithdraw();

    /// @param controllerAddress Address of the llamalend market controller
    /// @param to Address that will receive the withdrawn collateral
    /// @param collateralAmount Amount of collateral to withdraw
    struct Params {
        address controllerAddress;
        address to;
        uint256 collateralAmount;
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.collateralAmount = _parseParamUint(params.collateralAmount, _paramMapping[2], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _llamaLendWithdraw(params);
        emit ActionEvent("LlamaLendWithdraw", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _llamaLendWithdraw(params);
        logger.logActionDirectEvent("LlamaLendWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _llamaLendWithdraw(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.collateralAmount == 0) revert ZeroAmountWithdraw();

        /// @dev figure out if we need this calculated on-chain
        if (_params.collateralAmount == type(uint256).max) {
            _params.collateralAmount = userMaxWithdraw(_params.controllerAddress, address(this));
        }

        address collateralAsset = ILlamaLendController(_params.controllerAddress).collateral_token();

        if (_params.controllerAddress == OLD_WETH_CONTROLLER && block.chainid == 1) {
            ILlamaLendController(_params.controllerAddress).remove_collateral(_params.collateralAmount, false);
        } else {
            ILlamaLendController(_params.controllerAddress).remove_collateral(_params.collateralAmount);
        }

        collateralAsset.withdrawTokens(_params.to, _params.collateralAmount);

        return (_params.collateralAmount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
