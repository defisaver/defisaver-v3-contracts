// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { IPot } from "../../interfaces/mcd/IPot.sol";
import { IDaiJoin } from "../../interfaces/mcd/IDaiJoin.sol";
import { McdHelper } from "./helpers/McdHelper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

/// @title Action for depositing DAI into Maker DSR
contract McdDsrDeposit is McdHelper, ActionBase {
    using TokenUtils for address;

    /// @param amount Amount of DAI to deposit into DSR
    /// @param from Address from which the DAI will be pulled
    struct Params {
        uint256 amount;
        address from;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);

        (uint256 deposited, bytes memory logData) = _deposit(params);
        emit ActionEvent("McdDsrDeposit", logData);
        return bytes32(deposited);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _deposit(params);
        logger.logActionDirectEvent("McdDsrDeposit", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _deposit(Params memory _params) internal returns (uint256 deposited, bytes memory logData) {
        IPot pot = IPot(POT_ADDR);

        _params.amount = DAI_ADDRESS.pullTokensIfNeeded(_params.from, _params.amount);
        DAI_ADDRESS.approveToken(DAI_JOIN_ADDR, _params.amount);

        uint256 chi = (block.timestamp > pot.rho()) ? pot.drip() : pot.chi();
        uint256 pie = _params.amount * RAY / chi;

        IDaiJoin(DAI_JOIN_ADDR).join(address(this), _params.amount);

        if (vat.can(address(this), POT_ADDR) == 0) {
            vat.hope(POT_ADDR);
        }

        pot.join(pie);

        logData = abi.encode(_params);
        deposited = _params.amount;
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
