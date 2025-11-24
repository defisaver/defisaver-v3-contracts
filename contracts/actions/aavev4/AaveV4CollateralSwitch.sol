// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../interfaces/protocols/aaveV4/ISpoke.sol";
import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";

/// @title AaveV4CollateralSwitch
contract AaveV4CollateralSwitch is ActionBase {
    using TokenUtils for address;

    /// @param spoke Address of the spoke.
    /// @param onBehalf Address to switch collateral on behalf of. Defaults to the user's wallet if not provided.
    /// @param reserveId Reserve id.
    /// @param useAsCollateral Whether to use the tokens as collateral.
    struct Params {
        address spoke;
        address onBehalf;
        uint256 reserveId;
        bool useAsCollateral;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.spoke = _parseParamAddr(params.spoke, _paramMapping[0], _subData, _returnValues);
        params.onBehalf =
            _parseParamAddr(params.onBehalf, _paramMapping[1], _subData, _returnValues);
        params.reserveId =
            _parseParamUint(params.reserveId, _paramMapping[2], _subData, _returnValues);
        params.useAsCollateral =
            _parseParamUint(
                    params.useAsCollateral ? 1 : 0, _paramMapping[3], _subData, _returnValues
                ) == 1;

        bytes memory logData = _collateralSwitch(params);
        emit ActionEvent("AaveV4CollateralSwitch", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        bytes memory logData = _collateralSwitch(params);
        logger.logActionDirectEvent("AaveV4CollateralSwitch", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _collateralSwitch(Params memory _params) internal returns (bytes memory) {
        ISpoke(_params.spoke)
            .setUsingAsCollateral(_params.reserveId, _params.useAsCollateral, _params.onBehalf);

        return abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
