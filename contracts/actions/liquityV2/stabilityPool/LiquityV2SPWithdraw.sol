// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { IStabilityPool } from "../../../interfaces/protocols/liquityV2/IStabilityPool.sol";

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";

/// @title Withdraws a token from the LiquityV2 Stability Pool
contract LiquityV2SPWithdraw is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param boldTo The address to send the BOLD tokens to
    /// @param collGainTo The address to send the collateral gains to
    /// @param amount The amount of BOLD tokens to withdraw
    /// @param doClaim If true, the action will claim the collateral gains if existent
    struct Params {
        address market;
        address boldTo;
        address collGainTo;
        uint256 amount;
        bool doClaim;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.boldTo = _parseParamAddr(params.boldTo, _paramMapping[1], _subData, _returnValues);
        params.collGainTo = _parseParamAddr(params.collGainTo, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
        params.doClaim = _parseParamUint(params.doClaim ? 1 : 0, _paramMapping[4], _subData, _returnValues) == 1;

        (uint256 withdrawnAmount, bytes memory logData) = _spWithdraw(params);
        emit ActionEvent("LiquityV2SPWithdraw", logData);
        return bytes32(withdrawnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _spWithdraw(params);
        logger.logActionDirectEvent("LiquityV2SPWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _spWithdraw(Params memory _params) internal returns (uint256, bytes memory) {
        IStabilityPool pool = IStabilityPool(IAddressesRegistry(_params.market).stabilityPool());

        uint256 boldGain = _params.doClaim ? pool.getDepositorYieldGain(address(this)) : 0;

        uint256 collGain =
            _params.doClaim ? pool.getDepositorCollGain(address(this)) + pool.stashedColl(address(this)) : 0;

        uint256 compoundedBoldDeposit = pool.getCompoundedBoldDeposit(address(this));
        _params.amount = _params.amount > compoundedBoldDeposit ? compoundedBoldDeposit : _params.amount;

        pool.withdrawFromSP(_params.amount, _params.doClaim);

        uint256 boldToSend = _params.doClaim ? _params.amount + boldGain : _params.amount;
        BOLD_ADDR.withdrawTokens(_params.boldTo, boldToSend);

        if (_params.doClaim) {
            address collToken = IAddressesRegistry(_params.market).collToken();
            collToken.withdrawTokens(_params.collGainTo, collGain);
        }

        return (_params.amount, abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
