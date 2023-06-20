// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { ICrvUsdController, ICrvUsdControllerFactory, ILLAMMA } from "../../interfaces/curveusd/ICurveUsd.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CurveUsdHelper.sol";
import "hardhat/console.sol";

contract CurveUsdRepay is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    struct Params {
        address controllerAddress;
        uint256 collAmount;
        address to;
        uint256[] swapData;
    }

    bytes4 constant CURVE_SWAPPER_ID = bytes4(keccak256("CurveUsdSwapper"));

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
        params.collAmount = _parseParamUint(params.collAmount, _paramMapping[2], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _repay(params);
        emit ActionEvent("CurveUsdRepay", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _repay(params);
        logger.logActionDirectEvent("CurveUsdRepay", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _repay(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev see ICrvUsdController natspec
        if (_params.collAmount == 0) revert();

        // TODO: change this currently drawn from registry
        address crvUsdSwapper = registry.getAddr(CURVE_SWAPPER_ID);

        _params.swapData[0] = _params.collAmount;
        _params.swapData[1] = 0;// hardcoded route for now

        console.log("Call repay with callback");
        
        ICrvUsdController(_params.controllerAddress).repay_extended(crvUsdSwapper, _params.swapData);

        console.log("After callback");

        return (
            _params.collAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}