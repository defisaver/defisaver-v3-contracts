// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../../interfaces/fluid/IFluidVaultT1.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";

import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Adjust position on Fluid Vault T1 (1_col:1_debt)
contract FluidVaultT1Adjust is ActionBase, FluidHelper {
    using TokenUtils for address;

    enum CollActionType { SUPPLY, WITHDRAW }
    enum DebtActionType { PAYBACK, BORROW }

    struct Params {
        address vault;
        uint256 nftId;
        uint256 collAmount;
        uint256 debtAmount;
        address from;
        address to;
        CollActionType collAction;
        DebtActionType debtAction;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.vault = _parseParamAddr(params.vault, _paramMapping[0], _subData, _returnValues);
        params.nftId = _parseParamUint(params.nftId, _paramMapping[1], _subData, _returnValues);
        params.collAmount = _parseParamUint(params.collAmount, _paramMapping[2], _subData, _returnValues);
        params.debtAmount = _parseParamUint(params.debtAmount, _paramMapping[3], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[4], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[5], _subData, _returnValues);
        params.collAction = CollActionType(_parseParamUint(uint8(params.collAction), _paramMapping[6], _subData, _returnValues));
        params.debtAction = DebtActionType(_parseParamUint(uint8(params.debtAction), _paramMapping[7], _subData, _returnValues));

        (uint256 debtAmount, bytes memory logData) = _adjust(params);
        emit ActionEvent("FluidVaultT1Adjust", logData);
        return bytes32(debtAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _adjust(params);
        logger.logActionDirectEvent("FluidVaultT1Adjust", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _adjust(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVaultT1.ConstantViews memory constants = IFluidVaultT1(_params.vault).constantsView();
        address supplyToken = constants.supplyToken;
        address borrowToken = constants.borrowToken;

        return (uint256(0), abi.encode(_params));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
