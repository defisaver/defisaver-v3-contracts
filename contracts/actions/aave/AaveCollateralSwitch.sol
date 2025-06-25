// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveHelper } from "./helpers/AaveHelper.sol";

/// @title Switch action if user wants to use tokens for collateral on aave market
contract AaveCollateralSwitch is ActionBase, AaveHelper {
    using TokenUtils for address;

    /// @param market Aave Market address.
    /// @param tokens Tokens to switch as collateral.
    /// @param useAsCollateral Whether to use the tokens as collateral.
    struct Params {
        address market;
        address[] tokens;
        bool[] useAsCollateral;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);
        _switchAsCollateral(inputData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _switchAsCollateral(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _switchAsCollateral(Params memory _inputData) internal {
        for (uint256 i = 0; i < _inputData.tokens.length; i++){
            enableAsCollateral(_inputData.market, _inputData.tokens[i], _inputData.useAsCollateral[i]);
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
