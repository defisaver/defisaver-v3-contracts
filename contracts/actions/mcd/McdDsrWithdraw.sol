// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { IPot } from "../../interfaces/mcd/IPot.sol";
import { IDaiJoin } from "../../interfaces/mcd/IDaiJoin.sol";
import { McdHelper } from "./helpers/McdHelper.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";

/// @title Action for withdrawing DAI from Maker DSR
contract McdDsrWithdraw is McdHelper, ActionBase {
    using TokenUtils for address;

    /// @param amount Amount of DAI to withdraw from DSR
    /// @param to Address that will receive the withdrawn DAI
    struct Params {
        uint256 amount;
        address to;
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (uint256 withdrawn, bytes memory logData) = _withdraw(params);
        emit ActionEvent("McdDsrWithdraw", logData);
        return bytes32(withdrawn);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent("McdDsrWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function rdivup(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * RAY + y - 1) / y;
    }

    function _withdraw(Params memory _params) internal returns (uint256 withdrawn, bytes memory logData) {
        IPot pot = IPot(POT_ADDR);

        uint256 chi = (block.timestamp > pot.rho()) ? pot.drip() : pot.chi();
        uint256 pie;

        if (_params.amount == type(uint256).max) {
            pie = pot.pie(address(this));
            _params.amount = pie * chi / RAY;
        } else {
            pie = rdivup(_params.amount, chi);
        }

        pot.exit(pie);

        if (vat.can(address(this), DAI_JOIN_ADDR) == 0) {
            vat.hope(DAI_JOIN_ADDR);
        }

        IDaiJoin(DAI_JOIN_ADDR).exit(_params.to, _params.amount);

        logData = abi.encode(_params);
        withdrawn = _params.amount;
    }

    function parseInputs(bytes memory _callData)
        internal
        pure
        returns (Params memory inputData)
    {
        inputData = abi.decode(_callData, (Params));
    }
}
