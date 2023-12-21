// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../interfaces/curveusd/ICurveUsd.sol";


/// @title Action that returns users crvusd debt on a given market
contract CurveUsdGetDebt is ActionBase {

    /// @param controllerAddress Address of the curveusd market controller
    /// @param debtor Address which owns the curveusd position
    struct Params {
        address controllerAddress;
        address debtor;
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
        params.debtor = _parseParamAddr(params.debtor, _paramMapping[1], _subData, _returnValues);

        uint256 debt = ICrvUsdController(params.controllerAddress).debt(params.debtor);
        return bytes32(debt);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}