// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../../ActionBase.sol";
import { CurveHelper } from "../helpers/CurveHelper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Action that mints Crv tokens based on up to 8 gauges
contract CurveMintCrv is ActionBase, CurveHelper {
    using TokenUtils for address;
    
    /// @param gaugeAddrs Array of up to 8 gauge addresses determining Crv issuance 
    /// @param receiver Address that will receive the Crv issuance
    struct Params {
        address[8] gaugeAddrs;
        address receiver;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.receiver = _parseParamAddr(params.receiver, _paramMapping[0], _subData, _returnValues);
        
        (uint256 minted, bytes memory logData) = _curveMintCrv(params);
        emit ActionEvent("CurveMintCrv", logData);
        return bytes32(minted);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _curveMintCrv(params);
        logger.logActionDirectEvent("CurveMintCrv", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _curveMintCrv(Params memory _params) internal returns (uint256 minted, bytes memory logData) {
        require(_params.receiver != address(0), "receiver cant be 0x0");

        uint256 balanceBefore = CRV_TOKEN_ADDR.getBalance(address(this));
        Minter.mint_many(_params.gaugeAddrs);
        minted = CRV_TOKEN_ADDR.getBalance(address(this)) - (balanceBefore);

        CRV_TOKEN_ADDR.withdrawTokens(_params.receiver, minted);
        logData = abi.encode(_params, minted);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}