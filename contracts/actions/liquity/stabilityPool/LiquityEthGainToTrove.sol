// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LiquityHelper } from "../helpers/LiquityHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ActionBase } from "../../ActionBase.sol";

/// @title Action for withdrawing ETH gains to Trove
contract LiquityEthGainToTrove is ActionBase, LiquityHelper {
    using TokenUtils for address;
    
    /// @param lqtyTo Address that will receive LQTY token gains
    /// @param upperHint Upper hint for finding a Trove in linked list
    /// @param lowerHint Lower hint for finding a Trove in linked list
    struct Params {
        address lqtyTo;     
        address upperHint;
        address lowerHint;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.lqtyTo = _parseParamAddr(params.lqtyTo, _paramMapping[0], _subData, _returnValues);

        (uint256 ethGain, bytes memory logData) = _liquityEthGainToTrove(params);
        emit ActionEvent("LiquityEthGainToTrove", logData);
        return bytes32(ethGain);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _liquityEthGainToTrove(params);
        logger.logActionDirectEvent("LiquityEthGainToTrove", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _liquityEthGainToTrove(Params memory _params) internal returns (uint256 ethGain, bytes memory logData) {
        ethGain = StabilityPool.getDepositorETHGain(address(this));
        uint256 lqtyBefore = LQTY_TOKEN_ADDRESS.getBalance(address(this));
        
        StabilityPool.withdrawETHGainToTrove(_params.upperHint, _params.lowerHint);

        uint256 lqtyGain = LQTY_TOKEN_ADDRESS.getBalance(address(this)) - (lqtyBefore);

        withdrawStabilityGains(0, lqtyGain, address(0), _params.lqtyTo);
        logData = abi.encode(_params.lqtyTo, ethGain, lqtyGain);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
