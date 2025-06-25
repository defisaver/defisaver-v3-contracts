// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { CompHelper } from "./helpers/CompHelper.sol";

/// @title Switch action to switch if user will use tokens for collateral on compound
contract CompCollateralSwitch is ActionBase, CompHelper {
    using TokenUtils for address;

    /// @param cTokens Array of cTokens addresses
    /// @param useAsCollateral Array of booleans to indicate if the cToken should be used as collateral
    struct Params {
        address[] cTokens;
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
        for (uint256 i = 0; i < _inputData.cTokens.length; i++){
            if (_inputData.useAsCollateral[i]){
                enterMarket(_inputData.cTokens[i]);
            }else{
                exitMarket(_inputData.cTokens[i]);
            }
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
